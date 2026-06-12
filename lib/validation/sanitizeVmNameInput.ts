/** Strip disallowed chars as user types: lowercase a-z, 0-9, hyphen only; max 64. */
export function sanitizeVmNameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 64);
}
