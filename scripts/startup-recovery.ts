import { PrismaClient } from '@prisma/client';
import { recoverInterruptedProvisions } from '../lib/provisioning/recoverInterruptedProvisions';
import { enforcePaymentGraceBatch } from '../lib/billing/enforcePaymentGrace';

const db = new PrismaClient();

async function main() {
  const recovered = await recoverInterruptedProvisions(db);
  if (recovered > 0) {
    console.log(`[startup-recovery] Recovered ${recovered} interrupted provision(s) \u2192 FAILED.`);
  }

  const suspended = await enforcePaymentGraceBatch();
  if (suspended > 0) {
    console.log(`[startup-recovery] Suspended ${suspended} VM(s) with expired payment grace.`);
  }
}

main()
  .catch((e) => {
    console.error('[startup-recovery] Failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
