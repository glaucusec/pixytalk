/*
  Warnings:

  - Added the required column `senderType` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM (
  'CONTACT',
  'HUMAN',
  'AI',
  'SYSTEM'
);

-- Add the column as nullable
ALTER TABLE "Message"
ADD COLUMN "senderType" "MessageSenderType";

-- Backfill existing messages
UPDATE "Message"
SET "senderType" =
  CASE
    WHEN "direction" = 'INBOUND'
      THEN 'CONTACT'::"MessageSenderType"
    ELSE 'HUMAN'::"MessageSenderType"
  END;

-- Make the column required after backfilling
ALTER TABLE "Message"
ALTER COLUMN "senderType" SET NOT NULL;

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
