-- CreateEnum
CREATE TYPE "ScenarioKind" AS ENUM ('story_driven', 'code_deviation');

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "kind" "ScenarioKind" NOT NULL DEFAULT 'story_driven',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium';
