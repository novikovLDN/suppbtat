-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "assignedName" TEXT,
ADD COLUMN     "claimNotified" BOOLEAN NOT NULL DEFAULT false;
