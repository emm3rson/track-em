export function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoMonthAnchor(d: Date) {
  return isoDate(monthStart(d)); // yyyy-mm-01
}

export function formatMonthLabel(monthIsoAnchor: string) {
  const d = new Date(monthIsoAnchor);
  return d.toLocaleString("en-PH", { month: "long", year: "numeric" });
}
