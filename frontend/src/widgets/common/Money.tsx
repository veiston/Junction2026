const fmt = new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" });

/** Integer cents -> "1 234,56 €" (fi-FI). */
export function formatCents(cents: number): string {
  return fmt.format(cents / 100);
}

export function Money({ cents, signed = false }: { cents: number; signed?: boolean }) {
  const cls = signed ? (cents < 0 ? "money money--neg" : "money money--pos") : "money";
  return <span className={cls}>{formatCents(cents)}</span>;
}
