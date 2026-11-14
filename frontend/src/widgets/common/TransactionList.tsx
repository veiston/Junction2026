import type { TransactionListData } from "../../contracts-temp";
import type { WidgetProps } from "../../chat/registry";
import { Money } from "./Money";
import { WidgetCard } from "./WidgetCard";

export interface TransactionListProps extends WidgetProps<TransactionListData> {
  /** Called with the widget's filter when "See all" is pressed. */
  onSeeAll?: (filter: TransactionListData["filter"]) => void;
}

export function TransactionList({ widget, api, onSeeAll }: TransactionListProps) {
  const { title, filter, page } = widget.data;
  const hidden = page.total - page.items.length;
  // Default (when rendered via the registry): ask the chat; frontend-hooks may override with a paged view.
  const seeAll = onSeeAll ?? ((_filter: TransactionListData["filter"]) => api.sendChat({ message: `Show all: ${title}` }));
  return (
    <WidgetCard title={title}>
      {page.items.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <ul className="tx-list">
          {page.items.map((t) => (
            <li className="tx" key={t.id}>
              <span className="tx__label">
                {t.label}
                <time className="tx__date" dateTime={t.date}>{t.date}</time>
              </span>
              <Money cents={t.amount_cents} signed />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button type="button" className="link-btn" onClick={() => seeAll(filter)}>
          See all ({page.total})
        </button>
      )}
    </WidgetCard>
  );
}
