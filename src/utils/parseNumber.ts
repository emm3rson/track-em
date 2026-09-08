export function parseNumber(value: string) {
  return Number(value.replace(/,/g, ""));
}
