-- CreateEnum
CREATE TYPE "PriorityScore" AS ENUM ('CHAUD', 'TIEDE', 'FROID');

-- CreateTable
CREATE TABLE "ProspectPriority" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "score" "PriorityScore" NOT NULL,
    "raison" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectPriority_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProspectPriority_prospectId_key" ON "ProspectPriority"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectPriority_score_computedAt_idx" ON "ProspectPriority"("score", "computedAt");

-- AddForeignKey
ALTER TABLE "ProspectPriority" ADD CONSTRAINT "ProspectPriority_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
