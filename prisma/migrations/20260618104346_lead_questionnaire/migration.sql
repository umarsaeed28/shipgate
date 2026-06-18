/*
  Warnings:

  - You are about to drop the `OnboardingResponse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OnboardingResponse" DROP CONSTRAINT "OnboardingResponse_clientId_fkey";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "readiness" JSONB;

-- DropTable
DROP TABLE "OnboardingResponse";
