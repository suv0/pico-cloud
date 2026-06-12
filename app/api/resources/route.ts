import { NextRequest, NextResponse } from 'next/server';
import { ResourceStatus, UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { getApiSession } from '@/lib/auth/apiSession';
import { logEvent } from '@/lib/audit/logger';
import { runProvisionAsync } from '@/lib/provisioning/provisionService';
import { calculateCustomPrice } from '@/lib/pricing/estimator';
import { loadUnitPricesFromDb, UnitPriceConfigurationError } from '@/lib/pricing/unitPricesFromDb';
import { parseCreateResourceBody } from '@/lib/api/parseCreateResourceBody';
import { readJsonBody } from '@/lib/api/readJsonBody';
import { isResourceStatus } from '@/lib/provisioning/fsm';
import { assertCanProvisionNewVm, UnpaidQuotaError } from '@/lib/billing/unpaidQuota';
import { enforcePaymentGraceForUser } from '@/lib/billing/enforcePaymentGrace';

export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  if (status && !isResourceStatus(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  await enforcePaymentGraceForUser(session.userId);

  const resources = await db.resource.findMany({
    where: {
      userId: session.userId,
      ...(status ? { status: status as ResourceStatus } : {}),
    },
    include: { package: true, invoice: { select: { id: true, status: true, paymentDueAt: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(resources);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession();
    if (session instanceof NextResponse) return session;

    if (session.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin accounts cannot provision VMs. Sign in as a customer to provision.' },
        { status: 403 },
      );
    }

    const json = await readJsonBody(req);
    if (!json.ok) {
      return NextResponse.json({ error: json.error }, { status: 400 });
    }

    const parsed = parseCreateResourceBody(json.body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await db.resource.findUnique({
      where: { userId_name: { userId: session.userId, name: parsed.data.name } },
    });
    if (existing && existing.status !== 'TERMINATED') {
      return NextResponse.json({ error: 'You already have a VM with that name' }, { status: 409 });
    }

    try {
      await assertCanProvisionNewVm(session.userId);
    } catch (quotaErr) {
      if (quotaErr instanceof UnpaidQuotaError) {
        return NextResponse.json(
          {
            error: quotaErr.message,
            existingResourceId: quotaErr.existingResourceId,
            invoiceId: quotaErr.invoiceId,
          },
          { status: 409 },
        );
      }
      throw quotaErr;
    }

    if (parsed.data.type === 'fixed') {
      const pkg = await db.package.findUnique({ where: { id: parsed.data.packageId } });
      if (!pkg) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }

      const resource = await db.resource.create({
        data: {
          userId: session.userId,
          packageId: pkg.id,
          name: parsed.data.name,
          regionCode: parsed.data.regionCode,
          monthlyPriceBdt: pkg.monthlyPriceBdt,
          vcpu: pkg.vcpu,
          ramGb: pkg.ramGb,
          storageGb: pkg.storageGb,
          status: ResourceStatus.PENDING,
        },
      });

      await logEvent('resource', resource.id, 'RESOURCE_PROVISION_REQUESTED', undefined, session.userId);
      runProvisionAsync(resource.id);

      return NextResponse.json(resource, { status: 201 });
    }

    const { customSpec, name } = parsed.data;

    const unitPrices = await loadUnitPricesFromDb();
    const monthlyPriceBdt = calculateCustomPrice(customSpec, unitPrices);

    const resource = await db.resource.create({
      data: {
        userId: session.userId,
        name,
        regionCode: parsed.data.regionCode,
        monthlyPriceBdt,
        vcpu: customSpec.vcpu,
        ramGb: customSpec.ramGb,
        storageGb: customSpec.storageGb,
        status: ResourceStatus.PENDING,
      },
    });

    await logEvent('resource', resource.id, 'RESOURCE_PROVISION_REQUESTED', undefined, session.userId);
    runProvisionAsync(resource.id);

    return NextResponse.json(resource, { status: 201 });
  } catch (err) {
    if (err instanceof UnitPriceConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('POST /api/resources failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
