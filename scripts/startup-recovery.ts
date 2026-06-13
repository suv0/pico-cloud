import { PrismaClient } from '@prisma/client';
import { recoverInterruptedProvisions } from '../lib/provisioning/recoverInterruptedProvisions';
import { enforcePaymentGraceBatch } from '../lib/billing/enforcePaymentGrace';

const db = new PrismaClient();

async function main() {
  if (process.env.SESSION_SECRET === 'docker-dev-secret-32-chars-minimum-ok') {
    console.warn(
      '\n\u26A0\uFE0F  WARNING: Using the default demo SESSION_SECRET.\n' +
      '   This is acceptable for local demos only.\n' +
      '   For any deployment outside your machine, override SESSION_SECRET via .env.\n' +
      '   See README \u00A73 and \u00A78.\n',
    );
  }

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
