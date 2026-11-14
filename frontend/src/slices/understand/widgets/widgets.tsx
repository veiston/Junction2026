import type { WidgetProps } from "@/chat/registry";
import type { BasketBreakdown, BasketTrend, PeerBenchmark, SpenderProfile, SpendingSummary } from "@/contracts";

import { basketLabel, monthLabel } from "../format";
import { TREND_RANGES, useBasketBreakdown, useBasketTrend, useSpendingTransactions } from "../hooks/hooks";
import { BasketBreakdownView } from "./BasketBreakdownView";
import { BasketTrendView } from "./BasketTrendView";
import { MonthSwitcher, RangeSelector, SeeAll, Status } from "./controls";
import { PeerBenchmarkView } from "./PeerBenchmarkView";
import { SpenderProfileView } from "./SpenderProfileView";
import { SpendingSummaryView } from "./SpendingSummaryView";

export function BasketBreakdownWidget({ widget, api }: WidgetProps<BasketBreakdown>) {
  const b = useBasketBreakdown(api, widget.data);
  return (
    <BasketBreakdownView
      data={b.data}
      onSelectBasket={(basket) =>
        api.sendChat({
          message: `Tell me more about my ${basketLabel[basket].toLowerCase()} spending in ${monthLabel(b.data.month)}`,
        })
      }
      controls={
        <>
          <MonthSwitcher
            month={b.data.month}
            canPrev={b.canPrev}
            canNext={b.canNext}
            loading={b.loading}
            onPrev={b.prev}
            onNext={b.next}
          />
          <Status loading={b.loading} error={b.error} />
        </>
      }
    />
  );
}

export function BasketTrendWidget({ widget, api }: WidgetProps<BasketTrend>) {
  const t = useBasketTrend(api, widget.data);
  return (
    <BasketTrendView
      data={t.data}
      controls={
        <>
          <RangeSelector options={TREND_RANGES} value={t.months} loading={t.loading} onChange={t.setMonths} />
          <Status loading={t.loading} error={t.error} />
        </>
      }
    />
  );
}

export function SpendingSummaryWidget({ widget, api }: WidgetProps<SpendingSummary>) {
  const s = useSpendingTransactions(api, widget.data);
  return (
    <SpendingSummaryView
      data={widget.data}
      footer={
        <SeeAll
          total={widget.data.tx_count}
          shown={widget.data.sample_transactions.length}
          open={s.open}
          onToggle={s.toggle}
          data={s.data}
          loading={s.loading}
          error={s.error}
          page={s.page}
          pageCount={s.pageCount}
          setPage={s.setPage}
        />
      }
    />
  );
}

export function SpenderProfileWidget({ widget }: WidgetProps<SpenderProfile>) {
  return <SpenderProfileView data={widget.data} />;
}

export function PeerBenchmarkWidget({ widget }: WidgetProps<PeerBenchmark>) {
  return <PeerBenchmarkView data={widget.data} />;
}
