export const VM_NAME_REGEX = /^[a-z0-9-]+$/;

/** Default pre-fill for VM configure flows — valid per validateVmName. */
export const DEFAULT_VM_NAME = 'my-web-server';

/** Trim and lowercase before submit (call only after validateVmName passes). */
export function normalizeVmName(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateVmName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'VM name is required';
  }

  if (/\s/.test(name)) {
    return 'Spaces are not allowed. Use hyphens instead — e.g. my-web-server';
  }

  if (trimmed !== trimmed.toLowerCase()) {
    return 'Use lowercase letters only — e.g. my-web-server';
  }

  if (!VM_NAME_REGEX.test(trimmed)) {
    return 'Use lowercase letters, numbers, and hyphens only — e.g. my-web-server';
  }

  return null;
}

export function isVmNameValid(name: string): boolean {
  return name.trim().length > 0 && validateVmName(name) === null;
}
