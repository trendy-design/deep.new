import { Block } from "@/libs/store/chat.store";
import { Button } from "@repo/ui";
import { Fragment, useState } from "react";
import { ThreadBlockMetadata } from "./node-meta";
import { SearchAndReadingResults } from "./search-results";
import { StepStatus } from "./step-status";
import { AIThreadItem } from "./thread-item";
import { VaulDrawer } from "./vaul-drawer";
export const Steps = ({ steps }: { steps: Block[] }) => {
        const [debugMode, setDebugMode] = useState(false);
        return (
                <>
                <Button variant="link" size="xs" className="p-0" onClick={() => setDebugMode(!debugMode)}>Debug Mode</Button>
                <div className="flex w-full flex-col border rounded-xl pl-4 pr-8 py-8">


                        {(steps || []).map((block, index, array) => (

                                <div className="flex flex-row gap-2 items-stretch justify-start">
                                        <div className="flex flex-col items-center justify-start min-h-full px-2">
                                                <div className='bg-white z-10'>
                                                        <StepStatus status={block.nodeStatus} />
                                                </div>
                                                <div className="min-h-full flex-1 w-[1px] bg-zinc-100" />

                                        </div>
                                        <div className={"flex flex-col pb-4"} key={index}>

                                                <Fragment key={index}>
                                                        {block.nodeReasoning ? <p className="text-sm"> {block.nodeReasoning}</p> : null}
                                                        <SearchAndReadingResults toolCalls={block.toolCalls || []} toolCallResults={block.toolCallResults || []} />
                                                        {debugMode && <div className="flex flex-row gap-2">
                      <VaulDrawer renderContent={() => (<AIThreadItem content={block.content} key={index} />
                      )}>
                        <Button variant="link" size="xs" className="p-0">Read more</Button>
                      </VaulDrawer>
                      <VaulDrawer renderContent={() => (<ThreadBlockMetadata block={block} />
                      )}>
                        <Button variant="link" size="xs" className="p-0">More details</Button>
                      </VaulDrawer>
                      </div>}
                                                </Fragment>
                                        </div>
                                </div>
                        ))}
                </div>
                </>
        );
};

