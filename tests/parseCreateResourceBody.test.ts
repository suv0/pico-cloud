import { describe, expect, it } from 'vitest';
import { parseCreateResourceBody } from '@/lib/api/parseCreateResourceBody';

describe('parseCreateResourceBody', () => {
  it('accepts a valid custom VM request', () => {
    const result = parseCreateResourceBody({
      customSpec: { vcpu: 2, ramGb: 4, storageGb: 80 },
      name: 'my-web-server',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe('custom');
      expect(result.data.name).toBe('my-web-server');
      expect(result.data.regionCode).toBe('bd-dhaka');
    }
  });

  it('accepts an explicit region on fixed package requests', () => {
    const result = parseCreateResourceBody({
      packageId: 'pkg-1',
      name: 'my-vm',
      regionCode: 'bd-sylhet',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe('fixed');
      expect(result.data.regionCode).toBe('bd-sylhet');
    }
  });

  it('returns 400-style message for spaces in VM name', () => {
    const result = parseCreateResourceBody({
      customSpec: { vcpu: 2, ramGb: 4, storageGb: 80 },
      name: 'sdf dsf a',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        'Spaces are not allowed. Use hyphens instead — e.g. my-web-server',
      );
    }
  });

  it('returns 400-style message for invalid fixed-package name', () => {
    const result = parseCreateResourceBody({
      packageId: 'pkg-1',
      name: 'bad name',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Spaces are not allowed');
    }
  });

  it('returns 400-style message when package is missing', () => {
    const result = parseCreateResourceBody({
      name: 'my-vm',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Package is required');
    }
  });
});
