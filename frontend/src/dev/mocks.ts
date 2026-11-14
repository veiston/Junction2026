import { habitsMocks } from "@/slices/habits/mocks";
import type { Transaction, TransactionListData, WidgetType } from "@/contracts";

const tx = (id: number, date: string, label: string, cents: number): Transaction => ({
  id,
  date,
  timestamp: `${date}T09:00:00Z`,
  category: "Transportation",
  spend_group: "taxis",
  label,
  amount_cents: cents,
  balance_after_cents: 100000,
  flow: cents < 0 ? "spending" : "income",
  basket: cents < 0 ? "everyday" : null,
  merchant_id: null,
  mcc: null,
} as Transaction);

export const transactionListMock: TransactionListData = {
  title: "Latest transactions",
  filter: { from_date: "2026-09-01", to_date: "2026-09-15" },
  page: {
    items: [
      tx(1, "2026-09-14", "Taxis", -1840),
      tx(2, "2026-09-13", "Supermarkets", -5620),
      tx(3, "2026-09-12", "Salary", 245000),
      tx(4, "2026-09-10", "Rent / housing", -89000),
      tx(5, "2026-09-09", "Cafés", -480),
    ],
    page: 1,
    page_size: 5,
    total: 23,
    total_amount_cents: -312450,
  },
};

/** One mock per widget type that has a component. Slices add theirs here. */
export const mocks: Partial<Record<WidgetType, unknown>> = {
  transaction_list: transactionListMock,
  ...habitsMocks,
};
