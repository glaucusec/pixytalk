-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('AI', 'HUMAN');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "mode" "ConversationMode" NOT NULL DEFAULT 'AI',
ADD COLUMN     "modeChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "modeChangedById" UUID;

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "invitation" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "member" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "organization" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT pg_catalog.gen_random_uuid();

-- CreateIndex
CREATE INDEX "Conversation_organizationId_mode_idx" ON "Conversation"("organizationId", "mode");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_modeChangedById_fkey" FOREIGN KEY ("modeChangedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
