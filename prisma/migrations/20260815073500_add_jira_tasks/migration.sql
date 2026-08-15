-- CreateEnum
CREATE TYPE "JiraStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "JiraTask" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "comment" TEXT,
    "status" "JiraStatus" NOT NULL DEFAULT 'WAITING',
    "createdById" INTEGER,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JiraTask_key_key" ON "JiraTask"("key");

-- CreateIndex
CREATE INDEX "JiraTask_status_createdAt_idx" ON "JiraTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JiraTask_ticketId_idx" ON "JiraTask"("ticketId");

-- AddForeignKey
ALTER TABLE "JiraTask" ADD CONSTRAINT "JiraTask_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraTask" ADD CONSTRAINT "JiraTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
