-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ratedAt" TIMESTAMP(3),
ADD COLUMN     "rating" INTEGER;

-- CreateIndex
CREATE INDEX "Ticket_ratedAt_idx" ON "Ticket"("ratedAt");
