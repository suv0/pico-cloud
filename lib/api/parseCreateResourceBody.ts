import { z } from 'zod';
import { DEFAULT_REGION_CODE, REGION_CODES } from '@/lib/regions/catalog';
import { vmNameSchema } from '@/lib/validation/vmNameSchema';
import { firstZodError } from '@/lib/validation/zodError';

const customSpecSchema = z.object({
  vcpu: z.number().int().min(1).max(16),
  ramGb: z.number().int().min(2).max(64),
  storageGb: z.number().int().min(40).max(500),
});

const regionCodeSchema = z.enum(REGION_CODES).optional().default(DEFAULT_REGION_CODE);

const fixedResourceBody = z.object({
  packageId: z.string({ required_error: 'Package is required' }).min(1, 'Package is required'),
  name: vmNameSchema,
  regionCode: regionCodeSchema,
});

const customResourceBody = z.object({
  customSpec: customSpecSchema,
  name: vmNameSchema,
  regionCode: regionCodeSchema,
});

export type ParsedCreateResource =
  | { type: 'fixed'; packageId: string; name: string; regionCode: z.infer<typeof regionCodeSchema> }
  | { type: 'custom'; customSpec: z.infer<typeof customSpecSchema>; name: string; regionCode: z.infer<typeof regionCodeSchema> };

export function parseCreateResourceBody(
  body: unknown,
): { ok: true; data: ParsedCreateResource } | { ok: false; error: string } {
  const wantsCustom =
    typeof body === 'object' && body !== null && 'customSpec' in body;

  if (wantsCustom) {
    const parsed = customResourceBody.safeParse(body);
    if (parsed.success) {
      return {
        ok: true,
        data: {
          type: 'custom',
          customSpec: parsed.data.customSpec,
          name: parsed.data.name,
          regionCode: parsed.data.regionCode,
        },
      };
    }
    return { ok: false, error: firstZodError(parsed.error) };
  }

  const parsed = fixedResourceBody.safeParse(body);
  if (parsed.success) {
    return {
      ok: true,
      data: {
        type: 'fixed',
        packageId: parsed.data.packageId,
        name: parsed.data.name,
        regionCode: parsed.data.regionCode,
      },
    };
  }

  return { ok: false, error: firstZodError(parsed.error) };
}
