-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "workflowState" JSONB NOT NULL,
    "eventState" JSONB NOT NULL,
    "contextState" JSONB NOT NULL,
    "taskTimings" JSONB NOT NULL,
    "executionCounts" JSONB NOT NULL,
    "workflowConfig" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);
