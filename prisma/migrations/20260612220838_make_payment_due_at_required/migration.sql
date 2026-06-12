/*
  Warnings:

  - Made the column `paymentDueAt` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill existing NULLs before enforcing NOT NULL
UPDATE "Invoice" SET "paymentDueAt" = "createdAt" + interval '7 days' WHERE "paymentDueAt" IS NULL;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "paymentDueAt" SET NOT NULL;
