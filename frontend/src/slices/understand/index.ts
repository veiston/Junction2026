import type { SliceWidgets } from "@/contracts/widget-registry";

import {
  BasketBreakdownWidget,
  BasketTrendWidget,
  PeerBenchmarkWidget,
  SpenderProfileWidget,
  SpendingSummaryWidget,
} from "./widgets/widgets";

export const widgets: SliceWidgets = {
  basket_breakdown: BasketBreakdownWidget,
  basket_trend: BasketTrendWidget,
  spending_summary: SpendingSummaryWidget,
  spender_profile: SpenderProfileWidget,
  peer_benchmark: PeerBenchmarkWidget,
};
