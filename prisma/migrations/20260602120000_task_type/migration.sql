-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('RAPPEL', 'RELANCE', 'RDV', 'VERIFICATION', 'SUIVI');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "type" "TaskType" NOT NULL DEFAULT 'RAPPEL';

-- CreateIndex
CREATE INDEX "Task_assignedUserId_type_date_idx" ON "Task"("assignedUserId", "type", "date");

-- Migrate existing RDV-like titles to type RDV
UPDATE "Task"
SET "type" = 'RDV'
WHERE "type" = 'RAPPEL'
  AND (
    "titre" ILIKE '%rendez-vous%'
    OR "titre" ILIKE '%rdv%'
    OR "titre" ILIKE '%visite%'
    OR "titre" ILIKE '%meeting%'
  );
