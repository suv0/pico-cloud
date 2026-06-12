-- CreateTable
CREATE TABLE "PlatformComponent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "componentSlug" TEXT,
    "impactSummary" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "cpuAvgPct" DOUBLE PRECISION NOT NULL,
    "memAvgGb" DOUBLE PRECISION NOT NULL,
    "networkOutMb" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformComponent_slug_key" ON "PlatformComponent"("slug");

-- CreateIndex
CREATE INDEX "UsageRecord_resourceId_bucketStart_idx" ON "UsageRecord"("resourceId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_resourceId_bucketStart_key" ON "UsageRecord"("resourceId", "bucketStart");

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
