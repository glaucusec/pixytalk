CREATE TYPE "InboundProcessingStatus" AS ENUM (
    'PENDING',
    'ENQUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

CREATE TABLE "InboundProcessingJob" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" "InboundProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "enqueuedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundProcessingJob_providerMessageId_key"
    ON "InboundProcessingJob"("providerMessageId");
CREATE INDEX "InboundProcessingJob_status_createdAt_idx"
    ON "InboundProcessingJob"("status", "createdAt");
CREATE INDEX "InboundProcessingJob_organizationId_conversationId_idx"
    ON "InboundProcessingJob"("organizationId", "conversationId");

ALTER TABLE "InboundProcessingJob"
    ADD CONSTRAINT "InboundProcessingJob_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "WhatsAppAccount_organizationId_key"
    ON "WhatsAppAccount"("organizationId");
ALTER TABLE "InboundProcessingJob"
    ADD CONSTRAINT "InboundProcessingJob_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundProcessingJob"
    ADD CONSTRAINT "InboundProcessingJob_providerMessageId_fkey"
    FOREIGN KEY ("providerMessageId") REFERENCES "Message"("providerMessageId")
    ON DELETE CASCADE ON UPDATE CASCADE;
