-- Domain enums, FK on Invoice.userId, and query indexes

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "ResourceStatus" AS ENUM ('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED');
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PAID');
CREATE TYPE "PriceDimension" AS ENUM ('vcpu', 'ram_gb', 'storage_gb');
CREATE TYPE "ComponentStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'MAJOR_OUTAGE');
CREATE TYPE "IncidentStatus" AS ENUM ('INVESTIGATING', 'MONITORING', 'RESOLVED');
CREATE TYPE "IncidentSeverity" AS ENUM ('MINOR', 'MAJOR');
CREATE TYPE "AuditEntityType" AS ENUM ('resource', 'invoice', 'user', 'package', 'unit_price');
CREATE TYPE "AuditAction" AS ENUM (
  'RESOURCE_PROVISION_REQUESTED',
  'RESOURCE_PROVISION_STEP',
  'RESOURCE_PROVISIONING_STARTED',
  'RESOURCE_PROVISIONING_COMPLETE',
  'HEALTH_CHECK_PASSED',
  'RESOURCE_PROVISIONING_FAILED',
  'RESOURCE_RETRY_REQUESTED',
  'RESOURCE_RENAMED',
  'INVOICE_CREATED',
  'INVOICE_PAID',
  'USER_SIGNED_UP',
  'USER_LOGGED_IN',
  'PACKAGE_UPDATED',
  'UNIT_PRICE_UPDATED'
);

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

ALTER TABLE "Resource" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Resource" ALTER COLUMN "status" TYPE "ResourceStatus" USING ("status"::"ResourceStatus");
ALTER TABLE "Resource" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING ("status"::"InvoiceStatus");
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'UNPAID';

ALTER TABLE "UnitPrice" ALTER COLUMN "dimension" TYPE "PriceDimension" USING ("dimension"::"PriceDimension");

ALTER TABLE "PlatformComponent" ALTER COLUMN "status" TYPE "ComponentStatus" USING ("status"::"ComponentStatus");

ALTER TABLE "Incident" ALTER COLUMN "status" TYPE "IncidentStatus" USING ("status"::"IncidentStatus");
ALTER TABLE "Incident" ALTER COLUMN "severity" TYPE "IncidentSeverity" USING ("severity"::"IncidentSeverity");

ALTER TABLE "AuditEvent" ALTER COLUMN "entityType" TYPE "AuditEntityType" USING ("entityType"::"AuditEntityType");
ALTER TABLE "AuditEvent" ALTER COLUMN "action" TYPE "AuditAction" USING ("action"::"AuditAction");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Resource_userId_idx" ON "Resource"("userId");
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
