import { z } from 'zod';
import { validateVmName } from '@/lib/validation/vmName';

/** Zod schema aligned with validateVmName() — same rules and messages on client and server. */
export const vmNameSchema = z.string().max(64).superRefine((value, ctx) => {
  const message = validateVmName(value);
  if (message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});
