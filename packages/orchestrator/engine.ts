import { EventEmitter } from 'events';
import { LangfuseTraceClient } from 'langfuse';
import { v4 as uuidv4 } from 'uuid';
import { Context, ContextSchemaDefinition } from './context';
import { EventSchemaDefinition, TypedEventEmitter } from './events';
import { PersistenceLayer } from './persistence';
import { TaskErrorHandler, TaskParams } from './task';
export type WorkflowConfig = {
    maxIterations?: number;
    maxRetries?: number;
    timeoutMs?: number;
    retryDelayMs?: number;
    retryDelayMultiplier?: number;
    signal?: AbortSignal;
};

type TaskRouterParams<
    TEvent extends EventSchemaDefinition = any,
    TContext extends ContextSchemaDefinition = any,
> = TaskParams<TEvent, TContext> & {
    result: any;
};

// Add a new type for parallel task routing with custom data
export type ParallelTaskRoute = {
    task: string;
    data?: any;
};

type TaskExecutionFunction<
    TEvent extends EventSchemaDefinition = any,
    TContext extends ContextSchemaDefinition = any,
> = (
    params: Omit<TaskParams<TEvent, TContext>, 'signal'> & { signal?: AbortSignal }
) => Promise<{ result: any; next?: string | string[] | ParallelTaskRoute[] } | any>;

type TaskRouterFunction<
    TEvent extends EventSchemaDefinition = any,
    TContext extends ContextSchemaDefinition = any,
> = (
    params: TaskRouterParams<TEvent, TContext>
) => string | string[] | ParallelTaskRoute[] | undefined;

export type WorkflowContextData = {
    [key: string]: any;
};

export type TaskConfig<
    TEvent extends EventSchemaDefinition = any,
    TContext extends ContextSchemaDefinition = any,
> = {
    execute: TaskExecutionFunction<TEvent, TContext>;
    route: TaskRouterFunction<TEvent, TContext>;
    dependencies?: string[];
    retryCount?: number;
    timeoutMs?: number;
    onError?: TaskErrorHandler<TEvent, TContext>;
};

export type WorkflowState = {
    completedTasks: Set<string>;
    runningTasks: Set<string>;
    taskData: Map<string, any>;
    breakpointId?: string;
    breakpointData?: Record<string, any>;
    breakpointTask?: string;
};

export type TaskOptions = {
    name: string;
    execute: TaskExecutionFunction<any, any>;
    route?: TaskRouterFunction<any, any>;
    dependencies?: string[];
    retryCount?: number;
    timeoutMs?: number;
    onError?: TaskErrorHandler<any, any>;
    signal?: AbortSignal;
};

export type EventPayload = Record<string, any>;

type TaskTiming = {
    startTime: number;
    endTime?: number;
    duration?: number;
    status: 'success' | 'failed';
    error?: Error;
};

export class ExecutionContext {
    private state: WorkflowState;
    private aborted: boolean;
    private gracefulShutdown: boolean;
    private taskExecutionCounts: Map<string, number>;
    private eventEmitter: EventEmitter;

    private taskTimings: Map<string, TaskTiming[]>;

    constructor(eventEmitter: EventEmitter) {
        this.state = {
            completedTasks: new Set(),
            runningTasks: new Set(),
            taskData: new Map(),
            breakpointId: undefined,
            breakpointData: undefined,
            breakpointTask: undefined,
        };
        this.aborted = false;
        this.gracefulShutdown = false;
        this.taskExecutionCounts = new Map();
        this.eventEmitter = eventEmitter;
        this.taskTimings = new Map();
    }

    setState(func: (state: WorkflowState) => WorkflowState) {
        this.state = func(this.state);
    }

    markTaskComplete(taskName: string, data: any) {
        if (this.aborted && !this.gracefulShutdown) return;

        // Track execution count for this task
        const currentCount = this.taskExecutionCounts.get(taskName) || 0;
        const newCount = currentCount + 1;
        this.taskExecutionCounts.set(taskName, newCount);

        // Emit an event with the updated execution count
        this.emitTaskExecutionEvent(taskName, newCount);

        this.state.completedTasks.add(taskName);
        this.state.runningTasks.delete(taskName);
        this.state.taskData.set(taskName, data);
    }

    resetTaskCompletion(taskName: string) {
        this.state.completedTasks.delete(taskName);
    }

    getTaskExecutionCount(taskName: string): number {
        return this.taskExecutionCounts.get(taskName) || 0;
    }

    setTaskExecutionCount(taskName: string, count: number): void {
        this.taskExecutionCounts.set(taskName, count);
    }

    isTaskComplete(taskName: string) {
        return this.state.completedTasks.has(taskName);
    }

    isTaskRunning(taskName: string) {
        return this.state.runningTasks.has(taskName);
    }

    getTaskData(taskName: string) {
        return this.state.taskData.get(taskName);
    }

    abortWorkflow(graceful: boolean = false) {
        console.log(
            graceful ? '🟡 Gracefully stopping workflow...' : '🚨 Workflow aborted immediately!'
        );
        this.aborted = true;
        this.gracefulShutdown = graceful;
    }

    isAborted() {
        return this.aborted;
    }

    isGracefulShutdown() {
        return this.gracefulShutdown;
    }

    getAllTaskRunCounts(): Record<string, number> {
        const counts: Record<string, number> = {};
        this.taskExecutionCounts.forEach((count, name) => {
            counts[name] = count;
        });
        return counts;
    }

    emitTaskExecutionEvent(taskName: string, count: number): void {
        if (this.eventEmitter) {
            this.eventEmitter.emit('taskExecution', { taskName, count });
        }
    }

    hasReachedMaxRuns(taskName: string, maxRuns: number): boolean {
        const count = this.getTaskExecutionCount(taskName);
        return count >= maxRuns;
    }

    startTaskTiming(taskName: string) {
        const timing: TaskTiming = {
            startTime: Date.now(),
            status: 'success',
        };

        if (!this.taskTimings.has(taskName)) {
            this.taskTimings.set(taskName, []);
        }
        this.taskTimings.get(taskName)!.push(timing);
    }

    endTaskTiming(taskName: string, error?: Error) {
        const timings = this.taskTimings.get(taskName);
        if (timings && timings.length > 0) {
            const currentTiming = timings[timings.length - 1];
            currentTiming.endTime = Date.now();
            currentTiming.duration = currentTiming.endTime - currentTiming.startTime;
            if (error) {
                currentTiming.status = 'failed';
                currentTiming.error = error;
            }
        }
    }

    getTaskTimingSummary(): Record<
        string,
        {
            totalDuration: string;
            attempts: number;
            failures: number;
            averageDuration: string;
        }
    > {
        const summary: Record<string, any> = {};

        const formatDuration = (ms: number): string => {
            if (ms < 1000) return `${ms}ms`;
            if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
            return `${(ms / 60000).toFixed(1)}m`;
        };

        this.taskTimings.forEach((timings, taskName) => {
            const failures = timings.filter(t => t.status === 'failed').length;
            const completedTimings = timings.filter(t => t.duration !== undefined);
            const totalDuration = completedTimings.reduce((sum, t) => sum + (t.duration ?? 0), 0);
            const validAttempts = completedTimings.length;

            summary[taskName] = {
                totalDuration: formatDuration(totalDuration),
                attempts: timings.length,
                failures,
                averageDuration: formatDuration(
                    validAttempts > 0 ? totalDuration / validAttempts : 0
                ),
            };
        });

        return summary;
    }

    parseDurationToMs(duration: string): number {
        const [value, unit] = duration.split(' ');
        const multiplier = unit === 'ms' ? 1 : unit === 's' ? 1000 : 60000;
        return parseFloat(value) * multiplier;
    }

    getMainTimingSummary(): {
        totalRuns: number;
        totalFailures: number;
        totalDuration: string;
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        averageTaskDuration: string;
        slowestTask: string;
        highestFailureTask: string;
        status: 'success' | 'failed';
    } {
        const taskSummary = this.getTaskTimingSummary();
        let totalRuns = 0;
        let totalFailures = 0;
        let totalDurationMs = 0;
        let totalTasks = Object.keys(taskSummary).length;
        let failedTasks = 0;
        let slowestTask = { name: '', duration: 0 };
        let highestFailureTask = { name: '', failures: 0 };

        Object.entries(taskSummary).forEach(([taskName, stats]) => {
            totalRuns += stats.attempts;
            totalFailures += stats.failures;

            // Parse the duration strings back to milliseconds
            const durationMs = this.parseDurationToMs(stats.totalDuration);
            totalDurationMs += durationMs;

            if (stats.failures > 0) {
                failedTasks++;
            }

            if (durationMs > slowestTask.duration) {
                slowestTask = { name: taskName, duration: durationMs };
            }

            if (stats.failures > highestFailureTask.failures) {
                highestFailureTask = { name: taskName, failures: stats.failures };
            }
        });

        const formatDuration = (ms: number): string => {
            if (ms < 1000) return `${ms}ms`;
            if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
            return `${(ms / 60000).toFixed(1)}m`;
        };

        return {
            totalRuns,
            totalFailures,
            totalDuration: formatDuration(totalDurationMs),
            totalTasks,
            completedTasks: totalTasks - failedTasks,
            failedTasks,
            averageTaskDuration: formatDuration(totalTasks > 0 ? totalDurationMs / totalTasks : 0),
            slowestTask: slowestTask.name,
            highestFailureTask: highestFailureTask.name,
            status: this.isAborted() || failedTasks > 0 ? 'failed' : 'success',
        };
    }
}

export class WorkflowEngine<
    TEvent extends EventSchemaDefinition = any,
    TContext extends ContextSchemaDefinition = any,
> {
    private id: string;
    private tasks: Map<string, TaskConfig<TEvent, TContext>>;
    private eventEmitter: EventEmitter;
    private executionContext: ExecutionContext;
    private trace?: LangfuseTraceClient;
    private events?: TypedEventEmitter<TEvent>;
    private context?: Context<TContext>;
    private config?: WorkflowConfig;
    private persistence?: PersistenceLayer<TEvent, TContext>;
    private signal?: AbortSignal;

    constructor({
        id,
        trace,
        initialEventState,
        events,
        context,
        config,
        signal,
        persistence,
    }: {
        id: string;
        trace?: LangfuseTraceClient;
        initialEventState?: EventPayload;
        events?: TypedEventEmitter<TEvent>;
        context?: Context<TContext>;
        config?: WorkflowConfig;
        signal?: AbortSignal;
        persistence?: PersistenceLayer<TEvent, TContext>;
    }) {
        this.id = id;
        this.tasks = new Map();
        this.eventEmitter = new EventEmitter();
        this.executionContext = new ExecutionContext(this.eventEmitter);
        this.trace = trace;
        this.events = events;
        this.context = context;
        this.config = config;
        this.signal = signal;
        this.persistence = persistence;
    }

    persistState() {
        if (this.persistence) {
            this.persistence.saveWorkflow(this.id, this);
        }
    }

    createBreakpoint(task: string, data: any) {
        console.log('🔴 Creating breakpoint for task:', task);
        if (this.tasks.has(task)) {
            this.executionContext.setState(state => ({
                ...state,
                breakpointId: uuidv4(),
                breakpointData: data,
                breakpointTask: task,
            }));

            // Make sure we persist state immediately
            if (this.persistence) {
                this.persistence.saveWorkflow(this.id, this);
            }

            console.log(`🔴 Breakpoint created for task "${task}" with data:`, data);
        } else {
            throw new Error(`Task "${task}" not found.`);
        }
    }

    on<T extends string>(event: T, callback: (data: any) => void) {
        this.events?.on(event, callback);
    }

    onAll(callback: (event: keyof TEvent, data: any) => void) {
        this.events?.onAll(callback);
    }

    addTask(name: string, config: TaskConfig<TEvent, TContext>) {
        this.tasks.set(name, config);
    }

    async start(initialTask: string, initialData?: any) {
        // Initialize context with initial data if provided
        if (initialData) {
            // Also update typed context if available
            if (this.context) {
                this.context.merge(initialData);
            }
        }
        await this.executeTask(initialTask, initialData);
    }

    async resume(workflowId: string, breakpointId: string) {
        if (this.persistence) {
            const savedWorkflow: any = await this.persistence.loadWorkflow(workflowId);
            if (savedWorkflow) {
                console.log('🔴 Resuming workflow', savedWorkflow);

                // Properly deserialize the workflow state
                const deserializedState = this.deserializeState(savedWorkflow.workflowState);

                this.executionContext.setState((state: any) => ({
                    ...state,
                    ...deserializedState,
                    // Ensure these are properly converted back to Sets and Maps
                    runningTasks: deserializedState.runningTasks,
                    completedTasks: deserializedState.completedTasks,
                    taskData: deserializedState.taskData,
                }));

                // Restore event state
                if (this.events) {
                    this.events.setAllState(
                        this.deserializeState(JSON.parse(savedWorkflow.eventState))
                    );
                }

                // Restore context state
                if (this.context) {
                    this.context.merge(
                        this.deserializeState(JSON.parse(savedWorkflow.contextState))
                    );
                }

                // Restore task execution counts if available
                if (savedWorkflow.executionCounts) {
                    for (const [taskName, count] of Object.entries(savedWorkflow.executionCounts)) {
                        this.executionContext.setTaskExecutionCount(taskName, count as number);
                    }
                }

                if (this.tasks.has(savedWorkflow.workflowState.breakpointTask)) {
                    await this.executeTask(
                        savedWorkflow.workflowState.breakpointTask,
                        savedWorkflow.workflowState.breakpointData
                    );
                } else {
                    throw new Error(
                        `Task "${savedWorkflow.workflowState.breakpointTask}" not found.`
                    );
                }
            }
        }
    }

    // Add a deserializer method to handle the serialized data
    private deserializeState(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }

        // Handle serialized Set
        if (data && typeof data === 'object' && data.type === 'Set' && Array.isArray(data.value)) {
            return new Set(data.value);
        }

        // Handle serialized Map
        if (data && typeof data === 'object' && data.type === 'Map' && data.value) {
            return new Map(Object.entries(data.value));
        }

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.deserializeState(item));
        }

        // Handle objects
        if (typeof data === 'object') {
            const result: Record<string, any> = {};
            for (const [key, value] of Object.entries(data)) {
                result[key] = this.deserializeState(value);
            }
            return result;
        }

        // Return primitive values as is
        return data;
    }

    async executeTaskWithTimeout(
        task: (params: TaskParams<TEvent, TContext>) => Promise<any>,
        data: any,
        timeoutMs: number
    ) {
        return Promise.race([
            task({
                data,
                executionContext: this.executionContext,
                abort: this.executionContext.abortWorkflow.bind(this.executionContext),
                trace: this.trace,
                events: this.events,
                context: this.context,
                config: this.config,
                signal: this.signal,
                redirectTo: () => {},
                interrupt: (data: any) => {
                    console.log('🚨 Task interrupted:', data);
                },
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('⏳ Task timeout exceeded')), timeoutMs)
            ),
        ]);
    }

    async executeTask(taskName: string, data?: any) {
        if (this.executionContext.isAborted() && !this.executionContext.isGracefulShutdown()) {
            console.log(`⚠️ Task "${taskName}" skipped due to workflow abortion.`);
            return;
        }

        const config = this.tasks.get(taskName);
        if (!config) {
            console.error(`❌ Task "${taskName}" not found.`);
            this.executionContext.endTaskTiming(
                taskName,
                new Error(`Task "${taskName}" not found.`)
            );
            throw new Error(`Task "${taskName}" not found.`);

            return;
        }

        if (
            config.dependencies &&
            !config.dependencies.every(dep => this.executionContext.isTaskComplete(dep))
        ) {
            console.log(
                `⏳ Task "${taskName}" is waiting for dependencies: ${config.dependencies.join(', ')}`
            );
            return;
        }

        // For looping tasks, we need to reset the completion status
        if (this.executionContext.isTaskComplete(taskName)) {
            this.executionContext.resetTaskCompletion(taskName);
        }

        if (this.executionContext.isTaskRunning(taskName)) {
            return;
        }

        const executionCount = this.executionContext.getTaskExecutionCount(taskName);
        this.executionContext.setState(state => ({
            ...state,
            runningTasks: state.runningTasks.add(taskName),
        }));
        console.log(`🚀 Executing task "${taskName}" (Run #${executionCount + 1})`);

        this.executionContext.startTaskTiming(taskName);

        let attempt = 0;
        let taskRedirect: string | string[] | ParallelTaskRoute[] | undefined;

        while (attempt <= (config.retryCount || 0)) {
            try {
                // Create a redirect callback function for the task
                const redirectTo = (nextTask: string | string[] | ParallelTaskRoute[]) => {
                    taskRedirect = nextTask;
                };

                const taskResult = config.timeoutMs
                    ? await this.executeTaskWithTimeout(
                          params => config.execute({ ...params, redirectTo }),
                          data,
                          config.timeoutMs
                      )
                    : await config.execute({
                          data,
                          executionContext: this.executionContext,
                          abort: this.executionContext.abortWorkflow.bind(this.executionContext),
                          trace: this.trace,
                          events: this.events,
                          context: this.context,
                          config: this.config,
                          signal: this.signal,
                          redirectTo,
                          interrupt: (data: any) => {
                              console.log('🚨 Task interrupted:', data, taskName);
                              // Complete the current task before creating the breakpoint
                              this.executionContext.markTaskComplete(taskName, data);
                              this.createBreakpoint(taskName, data);
                              throw new BreakpointError('Breakpoint created');
                          },
                      });

                // Add this line to end timing for successful execution
                this.executionContext.endTaskTiming(taskName);

                // Check if the result is an object with direct routing information
                let result = taskResult;
                let directNextTasks;

                if (
                    taskResult &&
                    typeof taskResult === 'object' &&
                    'result' in taskResult &&
                    'next' in taskResult
                ) {
                    result = taskResult.result;
                    directNextTasks = taskResult.next;
                }

                this.executionContext.markTaskComplete(taskName, result);
                if (this.persistence) {
                    await this.persistence.saveWorkflow(this.id, this);
                }
                // Emit an event with the updated execution count
                const executionCount = this.executionContext.getTaskExecutionCount(taskName);
                this.executionContext.emitTaskExecutionEvent(taskName, executionCount);

                if (
                    this.executionContext.isAborted() &&
                    !this.executionContext.isGracefulShutdown()
                ) {
                    console.log(`⚠️ Workflow stopped after task "${taskName}".`);
                    return result;
                }

                // Check redirection sources in priority order:
                // 1. Explicit redirect callback from within the task
                // 2. Return value with 'next' property
                // 3. Router function
                let nextTasks = taskRedirect;

                if (nextTasks === undefined && directNextTasks !== undefined) {
                    nextTasks = directNextTasks;
                }

                if (nextTasks === undefined) {
                    nextTasks = config.route({
                        result,
                        executionContext: this.executionContext,
                        abort: this.executionContext.abortWorkflow.bind(this.executionContext),
                        trace: this.trace,
                        events: this.events,
                        context: this.context,
                        config: this.config,
                        redirectTo,
                        interrupt: (data: any) => {
                            console.log('🚨 Task interrupted:', data);
                            this.createBreakpoint(taskName, data);
                            throw new BreakpointError('Breakpoint created');
                        },
                    });
                }

                // Check for special "end" route value
                if (nextTasks === 'end') {
                    console.log(`🏁 Workflow ended after task "${taskName}".`);
                    if (this.persistence) {
                        await this.persistence.saveWorkflow(this.id, this);
                    }
                    return result;
                }

                if (nextTasks) {
                    if (Array.isArray(nextTasks)) {
                        if (
                            nextTasks.length > 0 &&
                            typeof nextTasks[0] === 'object' &&
                            'task' in nextTasks[0]
                        ) {
                            // Handle ParallelTaskRoute[] format
                            await Promise.all(
                                (nextTasks as ParallelTaskRoute[]).map(route =>
                                    this.executeTask(
                                        route.task,
                                        route.data !== undefined ? route.data : result
                                    )
                                )
                            );
                        } else {
                            // Handle string[] format (all tasks get the same data)
                            await Promise.all(
                                (nextTasks as string[]).map(nextTask =>
                                    this.executeTask(nextTask, result)
                                )
                            );
                        }
                    } else {
                        await this.executeTask(nextTasks as string, result);
                    }
                }
                if (this.persistence) {
                    await this.persistence.saveWorkflow(this.id, this);
                }
                return result;
            } catch (error) {
                this.executionContext.endTaskTiming(taskName, error as Error);
                attempt++;
                console.error(`❌ Error in task "${taskName}" (Attempt ${attempt}):`, error);

                if (error instanceof BreakpointError) {
                    console.log(`🔴 Breakpoint hit for task "${taskName}".`);
                    return;
                }

                if (config.onError) {
                    try {
                        const errorResult = await config.onError(error as Error, {
                            data,
                            executionContext: this.executionContext,
                            abort: this.executionContext.abortWorkflow.bind(this.executionContext),
                            trace: this.trace,
                            events: this.events,
                            context: this.context,
                            config: this.config,
                            redirectTo: () => {},
                            signal: this.signal,
                            interrupt: () => {},
                        });

                        if (errorResult.retry) {
                            if (attempt <= (config.retryCount || 0)) {
                                continue;
                            }
                        }

                        if (errorResult.result !== undefined) {
                            this.executionContext.markTaskComplete(taskName, errorResult.result);
                            if (this.persistence) {
                                await this.persistence.saveWorkflow(this.id, this);
                            }

                            if (errorResult.next) {
                                if (Array.isArray(errorResult.next)) {
                                    if (typeof errorResult.next[0] === 'object') {
                                        await Promise.all(
                                            (errorResult.next as ParallelTaskRoute[]).map(route =>
                                                this.executeTask(
                                                    route.task,
                                                    route.data !== undefined
                                                        ? route.data
                                                        : errorResult.result
                                                )
                                            )
                                        );
                                    } else {
                                        await Promise.all(
                                            (errorResult.next as string[]).map(nextTask =>
                                                this.executeTask(nextTask, errorResult.result)
                                            )
                                        );
                                    }
                                } else {
                                    await this.executeTask(
                                        errorResult.next as string,
                                        errorResult.result
                                    );
                                }
                            }
                            return errorResult.result;
                        }
                    } catch (errorHandlerError) {
                        console.error(
                            `❌ Error handler failed for task "${taskName}":`,
                            errorHandlerError
                        );
                    }
                }

                if (attempt > (config.retryCount || 0)) {
                    console.error(`⛔ Task "${taskName}" failed after ${attempt} attempts.`);
                    throw error;
                }
            }
        }
    }

    /**
     * Get the typed context
     */
    getContext(): Context<TContext> | undefined {
        return this.context;
    }

    /**
     * Get the typed events
     */
    getEvents(): TypedEventEmitter<TEvent> | undefined {
        return this.events;
    }

    task(options: TaskOptions): void {
        this.addTask(options.name, {
            execute: options.execute,
            route: options.route || (() => undefined),
            dependencies: options.dependencies,
            retryCount: options.retryCount || 0,
            timeoutMs: options.timeoutMs,
            onError: options.onError,
        });
    }

    abort(graceful: boolean = false) {
        this.executionContext.abortWorkflow(graceful);
        if (this.persistence) {
            this.persistence.saveWorkflow(this.id, this);
        }
    }

    getTaskRunCount(taskName: string): number {
        return this.executionContext.getTaskExecutionCount(taskName);
    }

    getAllTaskRunCounts(): Record<string, number> {
        return this.executionContext.getAllTaskRunCounts();
    }

    hasTaskReachedMaxRuns(taskName: string, maxRuns: number): boolean {
        return this.executionContext.hasReachedMaxRuns(taskName, maxRuns);
    }

    // Add a method to get the config
    getConfig(): WorkflowConfig | undefined {
        return this.config;
    }

    getTimingSummary() {
        return this.executionContext.getMainTimingSummary();
    }
}

export class BreakpointError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BreakpointError';
    }
}
