-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'RESOURCE_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'RESOURCE_RESUMED';
ALTER TYPE "AuditAction" ADD VALUE 'RESOURCE_TERMINATED';
ALTER TYPE "AuditAction" ADD VALUE 'INVOICE_GRACE_EXPIRED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResourceStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ResourceStatus" ADD VALUE 'TERMINATED';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentDueAt" TIMESTAMP(3);
