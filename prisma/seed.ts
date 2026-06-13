import {
  PrismaClient,
  AuditAction,
  AuditEntityType,
  ResourceStatus,
  InvoiceStatus,
  UserRole,
  PriceDimension,
  ComponentStatus,
  IncidentStatus,
  IncidentSeverity,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PAYMENT_GRACE_DAYS } from '../lib/billing/constants';
import { generateUsageBucketsForRange } from '../lib/metrics/usageHistory';

const db = new PrismaClient();

type PackageRef = { id: string; monthlyPriceBdt: number; vcpu: number; ramGb: number; storageGb: number };

type SeedAuditEvent = {
  action: AuditAction;
  detail?: string;
  offsetMs: number;
};

type SeedInvoice =
  | { status: typeof InvoiceStatus.UNPAID }
  | {
      status: typeof InvoiceStatus.PAID;
      paymentReference: string;
      cardLast4: string;
      paidOffsetMs: number;
    };

type SeedResourceSpec = {
  userId: string;
  name: string;
  packageRef: PackageRef;
  status: ResourceStatus;
  regionCode: string;
  publicIp?: string;
  failureReason?: string;
  provisionedOffsetMs?: number;
  createdOffsetMs?: number;
  invoice?: SeedInvoice | null;
  auditEvents: SeedAuditEvent[];
};

async function upsertCustomer(email: string, displayName: string, passwordHash: string) {
  return db.user.upsert({
    where: { email },
    update: { displayName },
    create: { email, passwordHash, displayName },
  });
}

async function seedResourceIfMissing(spec: SeedResourceSpec) {
  const existing = await db.resource.findFirst({
    where: { userId: spec.userId, name: spec.name },
  });
  if (existing) return existing;

  const baseTime = Date.now();
  const createdAt = new Date(baseTime + (spec.createdOffsetMs ?? -2 * 24 * 60 * 60 * 1000));
  const provisionedAt =
    spec.status === ResourceStatus.ACTIVE && spec.provisionedOffsetMs !== undefined
      ? new Date(baseTime + spec.provisionedOffsetMs)
      : spec.status === ResourceStatus.ACTIVE
        ? createdAt
        : undefined;

  const resource = await db.resource.create({
    data: {
      userId: spec.userId,
      packageId: spec.packageRef.id,
      name: spec.name,
      monthlyPriceBdt: spec.packageRef.monthlyPriceBdt,
      vcpu: spec.packageRef.vcpu,
      ramGb: spec.packageRef.ramGb,
      storageGb: spec.packageRef.storageGb,
      regionCode: spec.regionCode,
      status: spec.status,
      publicIp: spec.publicIp ?? null,
      failureReason: spec.failureReason ?? null,
      provisionedAt: provisionedAt ?? null,
      createdAt,
    },
  });

  if (spec.invoice) {
    const invoiceData =
      spec.invoice.status === InvoiceStatus.PAID
        ? {
            resourceId: resource.id,
            userId: spec.userId,
            amountBdt: spec.packageRef.monthlyPriceBdt,
            status: spec.invoice.status,
            paidAt: new Date(baseTime + spec.invoice.paidOffsetMs),
            paymentReference: spec.invoice.paymentReference,
            cardLast4: spec.invoice.cardLast4,
            paymentDueAt: new Date(baseTime + spec.invoice.paidOffsetMs + PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000),
          }
        : {
            resourceId: resource.id,
            userId: spec.userId,
            amountBdt: spec.packageRef.monthlyPriceBdt,
            status: spec.invoice.status,
            paymentDueAt: new Date(baseTime + PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000),
          };

    await db.invoice.create({ data: invoiceData });
  }

  await db.auditEvent.createMany({
    data: spec.auditEvents.map((ev) => ({
      entityType: AuditEntityType.resource,
      entityId: resource.id,
      action: ev.action,
      ...(ev.detail !== undefined ? { detail: ev.detail } : {}),
      userId: spec.userId,
      createdAt: new Date(baseTime + ev.offsetMs),
    })),
  });

  if (spec.invoice) {
    await db.auditEvent.create({
      data: {
        entityType: AuditEntityType.invoice,
        entityId: resource.id,
        action: AuditAction.INVOICE_CREATED,
        detail: `Amount: ৳${spec.packageRef.monthlyPriceBdt}`,
        userId: spec.userId,
        createdAt: new Date(baseTime + (spec.provisionedOffsetMs ?? 0) + 1000),
      },
    });

    if (spec.invoice.status === InvoiceStatus.PAID) {
      await db.auditEvent.create({
        data: {
          entityType: AuditEntityType.invoice,
          entityId: resource.id,
          action: AuditAction.INVOICE_PAID,
          detail: `Ref: ${spec.invoice.paymentReference}`,
          userId: spec.userId,
          createdAt: new Date(baseTime + spec.invoice.paidOffsetMs),
        },
      });
    }
  }

  console.log(`Created demo resource: ${spec.name} (${resource.id})`);
  return resource;
}

function provisionAudit(baseOffsetMs: number, publicIp?: string): SeedAuditEvent[] {
  return [
    { action: AuditAction.RESOURCE_PROVISION_REQUESTED, offsetMs: baseOffsetMs - 10000 },
    { action: AuditAction.RESOURCE_PROVISIONING_STARTED, offsetMs: baseOffsetMs - 5000 },
    {
      action: AuditAction.RESOURCE_PROVISIONING_COMPLETE,
      offsetMs: baseOffsetMs,
      ...(publicIp ? { detail: `IP: ${publicIp}` } : {}),
    },
  ];
}

function failedAudit(baseOffsetMs: number): SeedAuditEvent[] {
  return [
    { action: AuditAction.RESOURCE_PROVISION_REQUESTED, offsetMs: baseOffsetMs - 10000 },
    { action: AuditAction.RESOURCE_PROVISIONING_STARTED, offsetMs: baseOffsetMs - 5000 },
    {
      action: AuditAction.RESOURCE_PROVISIONING_FAILED,
      detail: 'Host capacity exceeded (simulated)',
      offsetMs: baseOffsetMs,
    },
  ];
}

function interruptedProvisioningAudit(baseOffsetMs: number): SeedAuditEvent[] {
  return [
    { action: AuditAction.RESOURCE_PROVISION_REQUESTED, offsetMs: baseOffsetMs - 10000 },
    { action: AuditAction.RESOURCE_PROVISIONING_STARTED, offsetMs: baseOffsetMs - 5000 },
    {
      action: AuditAction.RESOURCE_PROVISIONING_FAILED,
      detail: 'Provisioning interrupted — please retry.',
      offsetMs: baseOffsetMs - 1000,
    },
  ];
}

async function seedPlatformStatus() {
  const components = [
    {
      slug: 'api',
      name: 'API',
      status: ComponentStatus.OPERATIONAL,
      description: 'REST API and provisioning endpoints',
    },
    {
      slug: 'console',
      name: 'Customer Console',
      status: ComponentStatus.OPERATIONAL,
      description: 'Self-service dashboard and VM management',
    },
    {
      slug: 'billing',
      name: 'Billing',
      status: ComponentStatus.DEGRADED,
      description: 'Invoice generation and payment processing — elevated latency',
    },
    {
      slug: 'provisioning',
      name: 'Provisioning',
      status: ComponentStatus.OPERATIONAL,
      description: 'VM lifecycle orchestration and hypervisor integration',
    },
  ];

  for (const component of components) {
    await db.platformComponent.upsert({
      where: { slug: component.slug },
      update: {
        name: component.name,
        status: component.status,
        description: component.description,
      },
      create: component,
    });
  }

  const existingIncidents = await db.incident.count();
  if (existingIncidents === 0) {
    const now = Date.now();
    await db.incident.createMany({
      data: [
        {
          title: 'Elevated API latency in bd-chittagong',
          status: IncidentStatus.RESOLVED,
          severity: IncidentSeverity.MAJOR,
          componentSlug: 'api',
          impactSummary:
            'API response times increased 3–5× for Chittagong region requests. Root cause: upstream fiber link saturation.',
          startedAt: new Date(now - 7 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
          resolvedAt: new Date(now - 7 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        },
        {
          title: 'Scheduled maintenance — metrics pipeline',
          status: IncidentStatus.MONITORING,
          severity: IncidentSeverity.MINOR,
          componentSlug: 'provisioning',
          impactSummary:
            'Rolling upgrade of metrics aggregation nodes. Live telemetry may show brief gaps; no provisioning impact.',
          startedAt: new Date(now - 3 * 60 * 60 * 1000),
          resolvedAt: null,
        },
      ],
    });
  }
}

async function seedUsageRecordsForPaidActiveVms() {
  const resources = await db.resource.findMany({
    where: { status: ResourceStatus.ACTIVE, invoice: { status: InvoiceStatus.PAID } },
    include: { invoice: true },
  });

  for (const resource of resources) {
    const existing = await db.usageRecord.count({ where: { resourceId: resource.id } });
    if (existing > 0) continue;

    const buckets = generateUsageBucketsForRange(
      resource.id,
      resource.vcpu,
      resource.ramGb,
      7,
    );

    await db.usageRecord.createMany({
      data: buckets.map((bucket) => ({
        resourceId: resource.id,
        bucketStart: new Date(bucket.bucketStart),
        cpuAvgPct: bucket.cpuAvgPct,
        memAvgGb: bucket.memAvgGb,
        networkOutMb: bucket.networkOutMb,
      })),
    });

    console.log(`Seeded ${buckets.length} usage records for ${resource.name}`);
  }
}

async function main() {
  console.log('Seeding database...');

  await db.unitPrice.upsert({
    where: { dimension: PriceDimension.vcpu },
    update: {},
    create: { dimension: PriceDimension.vcpu, pricePerUnitBdt: 500 },
  });
  await db.unitPrice.upsert({
    where: { dimension: PriceDimension.ram_gb },
    update: {},
    create: { dimension: PriceDimension.ram_gb, pricePerUnitBdt: 200 },
  });
  await db.unitPrice.upsert({
    where: { dimension: PriceDimension.storage_gb },
    update: {},
    create: { dimension: PriceDimension.storage_gb, pricePerUnitBdt: 10 },
  });

  const starter = await db.package.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      slug: 'starter',
      name: 'Starter',
      vcpu: 1,
      ramGb: 1,
      storageGb: 25,
      monthlyPriceBdt: 1500,
    },
  });

  const standard = await db.package.upsert({
    where: { slug: 'standard' },
    update: {},
    create: {
      slug: 'standard',
      name: 'Standard',
      vcpu: 2,
      ramGb: 4,
      storageGb: 80,
      monthlyPriceBdt: 4500,
    },
  });

  const pro = await db.package.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      slug: 'pro',
      name: 'Pro',
      vcpu: 4,
      ramGb: 8,
      storageGb: 160,
      monthlyPriceBdt: 9000,
    },
  });

  const adminPasswordHash = await bcrypt.hash('123123123', 12);
  await db.user.upsert({
    where: { email: 'admin@test.com' },
    update: { role: UserRole.ADMIN, displayName: 'PICO Admin' },
    create: {
      email: 'admin@test.com',
      passwordHash: adminPasswordHash,
      displayName: 'PICO Admin',
      role: UserRole.ADMIN,
    },
  });

  const customerPasswordHash = await bcrypt.hash('demo1234', 12);

  const customer = await upsertCustomer('customer@demo.pico', 'Demo User', customerPasswordHash);
  const acme = await upsertCustomer('acme@demo.pico', 'Acme Corp', customerPasswordHash);
  const startup = await upsertCustomer('startup@demo.pico', 'Startup Labs', customerPasswordHash);
  const labs = await upsertCustomer('labs@demo.pico', 'Dev Labs', customerPasswordHash);

  const demoCustomers = [customer, acme, startup, labs];

  // customer@demo.pico — unpaid active + failed
  await seedResourceIfMissing({
    userId: customer.id,
    name: 'demo-web-server',
    packageRef: standard,
    status: ResourceStatus.ACTIVE,
    regionCode: 'bd-dhaka',
    publicIp: '203.0.113.100',
    provisionedOffsetMs: -2 * 24 * 60 * 60 * 1000,
    invoice: { status: InvoiceStatus.UNPAID },
    auditEvents: provisionAudit(-2 * 24 * 60 * 60 * 1000, '203.0.113.100'),
  });

  await seedResourceIfMissing({
    userId: customer.id,
    name: 'fail-example',
    packageRef: starter,
    status: ResourceStatus.FAILED,
    regionCode: 'bd-dhaka',
    failureReason: 'Simulated provisioning failure: host capacity exceeded',
    createdOffsetMs: -1 * 24 * 60 * 60 * 1000,
    invoice: null,
    auditEvents: failedAudit(-1 * 24 * 60 * 60 * 1000),
  });

  // acme@demo.pico — paid + unpaid active
  await seedResourceIfMissing({
    userId: acme.id,
    name: 'api-prod',
    packageRef: pro,
    status: ResourceStatus.ACTIVE,
    regionCode: 'bd-chittagong',
    publicIp: '203.0.113.50',
    provisionedOffsetMs: -5 * 24 * 60 * 60 * 1000,
    invoice: {
      status: InvoiceStatus.PAID,
      paymentReference: 'PAY-DEMO-ACME-001',
      cardLast4: '4242',
      paidOffsetMs: -4 * 24 * 60 * 60 * 1000,
    },
    auditEvents: provisionAudit(-5 * 24 * 60 * 60 * 1000, '203.0.113.50'),
  });

  await seedResourceIfMissing({
    userId: acme.id,
    name: 'worker-01',
    packageRef: standard,
    status: ResourceStatus.ACTIVE,
    regionCode: 'bd-dhaka',
    publicIp: '203.0.113.51',
    provisionedOffsetMs: -3 * 24 * 60 * 60 * 1000,
    invoice: { status: InvoiceStatus.UNPAID },
    auditEvents: provisionAudit(-3 * 24 * 60 * 60 * 1000, '203.0.113.51'),
  });

  // startup@demo.pico — interrupted provision (retry demo), no invoice
  await seedResourceIfMissing({
    userId: startup.id,
    name: 'staging-app',
    packageRef: starter,
    status: ResourceStatus.FAILED,
    regionCode: 'bd-sylhet',
    failureReason: 'Provisioning interrupted — please retry.',
    createdOffsetMs: -30 * 60 * 1000,
    invoice: null,
    auditEvents: interruptedProvisioningAudit(-30 * 60 * 1000),
  });

  // labs@demo.pico — unpaid + paid mix
  await seedResourceIfMissing({
    userId: labs.id,
    name: 'dev-box',
    packageRef: starter,
    status: ResourceStatus.ACTIVE,
    regionCode: 'bd-sylhet',
    publicIp: '203.0.113.10',
    provisionedOffsetMs: -6 * 24 * 60 * 60 * 1000,
    invoice: { status: InvoiceStatus.UNPAID },
    auditEvents: provisionAudit(-6 * 24 * 60 * 60 * 1000, '203.0.113.10'),
  });

  await seedResourceIfMissing({
    userId: labs.id,
    name: 'test-vm',
    packageRef: standard,
    status: ResourceStatus.ACTIVE,
    regionCode: 'bd-dhaka',
    publicIp: '203.0.113.11',
    provisionedOffsetMs: -7 * 24 * 60 * 60 * 1000,
    invoice: {
      status: InvoiceStatus.PAID,
      paymentReference: 'PAY-DEMO-LABS-001',
      cardLast4: '1111',
      paidOffsetMs: -6 * 24 * 60 * 60 * 1000 + 3600000,
    },
    auditEvents: provisionAudit(-7 * 24 * 60 * 60 * 1000, '203.0.113.11'),
  });

  await seedPlatformStatus();
  await seedUsageRecordsForPaidActiveVms();

  console.log('Seed complete.');
  console.log('Demo customer accounts (password demo1234 for all):');
  for (const u of demoCustomers) {
    console.log(`  - ${u.email}`);
  }
  console.log('Admin credentials: admin@test.com / 123123123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
