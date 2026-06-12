import { describe, expect, it } from 'vitest';
import { sanitizeVmNameInput } from '@/lib/validation/sanitizeVmNameInput';
import { isVmNameValid, normalizeVmName, validateVmName, DEFAULT_VM_NAME } from '@/lib/validation/vmName';

describe('vmName', () => {
  it('trims and lowercases on normalize', () => {
    expect(normalizeVmName('  My-VM  ')).toBe('my-vm');
  });

  it('accepts valid names', () => {
    expect(validateVmName('my-vm-01')).toBeNull();
    expect(isVmNameValid('my-vm-01')).toBe(true);
  });

  it('accepts the default VM name constant', () => {
    expect(validateVmName(DEFAULT_VM_NAME)).toBeNull();
    expect(isVmNameValid(DEFAULT_VM_NAME)).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateVmName('   ')).toBe('VM name is required');
    expect(isVmNameValid('')).toBe(false);
  });

  it('rejects spaces with a clear message', () => {
    expect(validateVmName('sdf dsf a')).toBe(
      'Spaces are not allowed. Use hyphens instead — e.g. my-web-server',
    );
    expect(isVmNameValid('sdf dsf a')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(validateVmName('my_vm!')).toBe(
      'Use lowercase letters, numbers, and hyphens only — e.g. my-web-server',
    );
  });

  it('rejects uppercase', () => {
    expect(validateVmName('MyVM')).toBe(
      'Use lowercase letters only — e.g. my-web-server',
    );
  });
});

describe('sanitizeVmNameInput', () => {
  it('strips spaces', () => {
    expect(sanitizeVmNameInput('my vm name')).toBe('myvmname');
  });

  it('lowercases uppercase letters', () => {
    expect(sanitizeVmNameInput('MyVM-01')).toBe('myvm-01');
  });

  it('removes invalid symbols', () => {
    expect(sanitizeVmNameInput('my_vm!@#')).toBe('myvm');
  });

  it('enforces max length of 64', () => {
    const long = 'a'.repeat(80);
    expect(sanitizeVmNameInput(long)).toHaveLength(64);
  });

  it('preserves valid hyphenated names', () => {
    expect(sanitizeVmNameInput('my-web-server-01')).toBe('my-web-server-01');
  });
});
