export function mockPublicIp(resourceId: string): string {
  const hash = resourceId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const b2 = (hash % 254) + 1;
  return `203.0.113.${b2}`;
}
