export function parsePositiveQuantity(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function stepQuantity(value: string, delta: number, min = 1): string {
  const parsed = parsePositiveQuantity(value);
  if (parsed === null) return formatQuantity(min);
  const base = parsed;
  return formatQuantity(Math.max(base + delta, min));
}
