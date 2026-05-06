-- CreateEnum
CREATE TYPE "LeadTypeEnum" AS ENUM ('HOT', 'WARM', 'COLD', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Attendee"
ADD COLUMN "leadType" "LeadTypeEnum" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "leadReason" VARCHAR(255),
ADD COLUMN "lastConversationAt" TIMESTAMP(3);
