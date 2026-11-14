import type { Source } from "../../contracts-temp";

export function SourceLine({ source }: { source: Source }) {
  return (
    <p className="source-line">
      {source.description} · {source.period.from_date} – {source.period.to_date} · {source.tx_count} transactions
    </p>
  );
}
