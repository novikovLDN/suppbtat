-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "internal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "category" TEXT,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "firstWaitingAt" TIMESTAMP(3),
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Template_pinned_usageCount_idx" ON "Template"("pinned", "usageCount");
