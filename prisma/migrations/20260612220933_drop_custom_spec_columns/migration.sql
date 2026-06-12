/*
  Warnings:

  - You are about to drop the column `customRamGb` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `customStorageGb` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `customVcpu` on the `Resource` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "customRamGb",
DROP COLUMN "customStorageGb",
DROP COLUMN "customVcpu";
