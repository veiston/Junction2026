import type { ReactNode } from "react";

export function WidgetCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card" aria-label={title}>
      {title && <h3 className="card__title">{title}</h3>}
      {children}
    </section>
  );
}
