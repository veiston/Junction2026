import { fireEvent, render, screen } from "@testing-library/react-native";

import { WidgetHost } from "@/chat/WidgetHost";
import type { WidgetHostApi } from "@/chat/registry";
import type { BasketTrend, Widget, WidgetType } from "@/contracts";
import { formatCents } from "@/widgets/common/Money";

import { learnBreakdown, learnPeers, learnProfile, learnSpending, learnTrend } from "./learn";
import {
  basketBreakdownMock,
  basketTrendMock,
  mocks,
  peerBenchmarkMock,
  spenderProfileMock,
  spendingSummaryMock,
} from "./mocks";

const BLAME = ["bad", "irresponsible", "waste", "lazy", "careless", "failure"];

describe("did you know tips", () => {
  it("breakdown: points at the irregular buffer when surprises are a big share", () => {
    expect(learnBreakdown(basketBreakdownMock).tip).toMatch(/^Mandatory & irregular costs \(13,5 % here\)|everyday/i);
    const calm = {
      ...basketBreakdownMock,
      baskets: basketBreakdownMock.baskets.map((b) =>
        b.basket === "mandatory_irregular" ? { ...b, share_pct: 2 } : b,
      ),
    } as typeof basketBreakdownMock;
    expect(learnBreakdown(calm).tip).toContain("Spending 10 % less there would keep about 11 €");
  });

  it("trend: compares full months only and names lifestyle creep", () => {
    expect(learnTrend(basketTrendMock).tip).toBe(
      "Everyday spending grew 30 % from Apr to Aug. Small, slow growth like this is called lifestyle creep.",
    );
    const flat: BasketTrend = { ...basketTrendMock, months: basketTrendMock.months.slice(-2) };
    expect(learnTrend(flat).tip).toBe("Watching a trend shows slow changes that a single month hides.");
  });

  it("spending: projects the pace to a year", () => {
    expect(learnSpending(spendingSummaryMock).tip.replace(/\s/g, " ")).toBe(
      "At this pace, taxis adds up to about 1 469 € a year.",
    );
    expect(learnSpending({ ...spendingSummaryMock, amount_cents: 0 }).tip).toContain("No taxis spending");
  });

  it("every tip is friendly and every widget offers 2-3 next steps", () => {
    const all = [
      learnBreakdown(basketBreakdownMock),
      learnTrend(basketTrendMock),
      learnSpending(spendingSummaryMock),
      learnProfile(spenderProfileMock),
      learnPeers(peerBenchmarkMock),
    ];
    for (const l of all) {
      expect(BLAME.some((w) => l.tip.toLowerCase().split(/\W+/).includes(w))).toBe(false);
      expect(l.next.length).toBeGreaterThanOrEqual(2);
      expect(l.next.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("learning under each card", () => {
  const owned: WidgetType[] = ["basket_breakdown", "basket_trend", "spending_summary", "spender_profile", "peer_benchmark"];

  it.each(owned)("%s shows a Did you know tip", (type) => {
    const api = { request: jest.fn(), sendChat: jest.fn(), formatCents } as unknown as WidgetHostApi;
    render(<WidgetHost widget={{ id: "w", version: 1, type, data: mocks[type] } as Widget} api={api} />);
    expect(screen.getByText("Did you know?")).toBeTruthy();
    expect(screen.getByTestId("did-you-know")).toBeTruthy();
  });

  it("a next-step chip continues the conversation", () => {
    const api = { request: jest.fn(), sendChat: jest.fn(), formatCents } as unknown as WidgetHostApi;
    render(<WidgetHost widget={{ id: "w", version: 1, type: "basket_breakdown", data: basketBreakdownMock } as Widget} api={api} />);
    fireEvent.press(screen.getByText("What kind of spender am I?"));
    expect(api.sendChat).toHaveBeenCalledWith({ message: "What kind of spender am I?" });
  });
});
