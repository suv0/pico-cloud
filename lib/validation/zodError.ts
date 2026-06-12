import type { ZodError } from 'zod';

export function firstZodError(error: ZodError | undefined): string {
  const issue = error?.issues[0];
  return issue?.message ?? 'Invalid request body';
}
