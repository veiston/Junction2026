import type { WidgetProps } from "@/chat/registry";
import type { BasketBreakdown, BasketTrend, PeerBenchmark, SpenderProfile, SpendingSummary } from "@/contracts";

import { basketLabel, monthLabel } from "../format";
import { BasketBreakdownView } from "./BasketBreakdownView";
import { BasketTrendView } from "./BasketTrendView";
import { PeerBenchmarkView } from "./PeerBenchmarkView";
import { SpenderProfileView } from "./SpenderProfileView";
import { SpendingSummaryView } from "./SpendingSummaryView";

export function BasketBreakdownWidget({ widget, api }: WidgetProps<BasketBreakdown>) {
  const data = widget.data;
  return (
    <BasketBreakdownView
      data={data}
      onSelectBasket={(b) =>
        api.sendChat({ message: `Tell me more about my ${basketLabel[b].toLowerCase()} spending in ${monthLabel(data.month)}` })
      }
    />
  );
}

export function BasketTrendWidget({ widget }: WidgetProps<BasketTrend>) {
  return <BasketTrendView data={widget.data} />;
}

export function SpendingSummaryWidget({ widget }: WidgetProps<SpendingSummary>) {
  return <SpendingSummaryView data={widget.data} />;
}

export function SpenderProfileWidget({ widget }: WidgetProps<SpenderProfile>) {
  return <SpenderProfileView data={widget.data} />;
}

export function PeerBenchmarkWidget({ widget }: WidgetProps<PeerBenchmark>) {
  return <PeerBenchmarkView data={widget.data} />;
}
