import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionList } from "./TransactionList";
import { formatCents } from "./Money";
import { transactionListMock } from "../../dev/mocks";

const api = { request: vi.fn(), sendChat: vi.fn(), formatCents };
const widget = { id: "w", type: "transaction_list" as const, version: 1 as const, data: transactionListMock as never };

describe("TransactionList", () => {
  it("formats money in fi-FI and calls onSeeAll with the filter", () => {
    const onSeeAll = vi.fn();
    render(<TransactionList widget={widget} api={api} onSeeAll={onSeeAll} />);
    expect(formatCents(-1840).replace(/\s/g, " ")).toMatch(/^[-−]18,40 €$/);
    fireEvent.click(screen.getByRole("button", { name: /see all/i }));
    expect(onSeeAll).toHaveBeenCalledWith(transactionListMock.filter);
  });

  it("hides See all when everything is shown", () => {
    const data = { ...transactionListMock, page: { ...transactionListMock.page, total: 5 } };
    render(<TransactionList widget={{ ...widget, data }} api={api} onSeeAll={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /see all/i })).toBeNull();
  });
});
