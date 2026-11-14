import type { TransactionFilter } from "../contracts-temp";
import { Money } from "../widgets/common/Money";
import { useTransactions } from "./useTransactions";

interface Props { title: string; filter: TransactionFilter; onClose: () => void }

export function SeeAllPanel({ title, filter, onClose }: Props) {
  const { data, page, pageCount, loading, error, setPage } = useTransactions(filter);
  return (
    <section className="widget" role="dialog" aria-label={`${title} (all)`}>
      <header>
        <h2>{title}</h2>
        <button type="button" className="link-btn" onClick={onClose}>Back to chat</button>
      </header>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p data-testid="see-all-totals">
            {data.total} transactions · total <Money cents={data.total_amount_cents} signed />
          </p>
          <ul className="tx-list" aria-busy={loading}>
            {data.items.map((t) => (
              <li className="tx" key={t.id}>
                <span className="tx__label">
                  {t.label}
                  <time className="tx__date" dateTime={t.date}>{t.date}</time>
                </span>
                <Money cents={t.amount_cents} signed />
              </li>
            ))}
          </ul>
          <nav aria-label="Pages">
            <button type="button" className="link-btn" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span> Page {page} of {pageCount} </span>
            <button type="button" className="link-btn" disabled={loading || page >= pageCount} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
      {!data && loading && <p>Loading…</p>}
    </section>
  );
}
