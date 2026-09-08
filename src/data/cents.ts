/** Convert a user-facing decimal amount (e.g. 150.50) to integer cents (15050). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert integer cents (15050) to a display-ready decimal (150.50). */
export function fromCents(cents: number): number {
  return cents / 100;
}
