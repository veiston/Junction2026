const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-09" -> "September 2026". Returns the input when it is not a year-month. */
export function monthLabel(ym: string | undefined | null): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
  if (!m) return ym ?? "";
  return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
