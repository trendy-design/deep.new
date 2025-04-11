import { createTask } from '@repo/orchestrator';
import { getModelFromChatMode } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChunkBuffer, generateText, getHumanizedDate, handleError, sendEvents } from '../utils';

export const completionTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'completion',
    execute: async ({ events, context, signal, redirectTo, interrupt }) => {
        if (!context) {
            throw new Error('Context is required but was not provided');
        }

        const { updateStatus, updateAnswer, updateStep, addSources } = sendEvents(events);

        const messages =
            context
                .get('messages')
                ?.filter(
                    message =>
                        (message.role === 'user' || message.role === 'assistant') &&
                        !!message.content
                ) || [];

        const mode = context.get('mode');

        const model = getModelFromChatMode(mode);

        let prompt = `You are a helpful assistant that can answer questions and help with tasks.
        Today is ${getHumanizedDate()}.
        `;

        const reasoningBuffer = new ChunkBuffer({
            threshold: 200,
            breakOn: ['\n\n'],
            onFlush: (_chunk: string, fullText: string) => {
                updateStep({
                    stepId: 0,
                    stepStatus: 'COMPLETED',
                    subSteps: {
                        reasoning: {
                            data: fullText,
                            status: 'COMPLETED',
                        },
                    },
                });
            },
        });

        const chunkBuffer = new ChunkBuffer({
            threshold: 200,
            breakOn: ['\n'],
            onFlush: (text: string) => {
                updateAnswer({
                    text,
                    status: 'PENDING' as const,
                });
            },
        });

        const response = await generateText({
            model,
            messages,
            prompt,
            signal,
            onReasoning: (chunk, fullText) => {
                reasoningBuffer.add(chunk);
            },
            onChunk: (chunk, fullText) => {
                chunkBuffer.add(chunk);
            },
        });

        reasoningBuffer.end();
        chunkBuffer.end();

        updateAnswer({
            text: '',
            finalText: response,
            status: 'COMPLETED',
        });

        context.update('answer', _ => {
            return {
                text: response,
                finalText: response,
                status: 'COMPLETED' as const,
            };
        });
        updateStatus('COMPLETED');
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
