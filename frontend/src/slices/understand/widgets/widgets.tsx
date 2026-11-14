import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { WidgetHostApi, WidgetProps } from "@/chat/registry";
import type { BasketBreakdown, BasketTrend, PeerBenchmark, SpenderProfile, SpendingSummary } from "@/contracts";
import { spacing } from "@/theme";

import { basketLabel, monthLabel } from "../format";
import { TREND_RANGES, useBasketBreakdown, useBasketTrend, useSpendingTransactions } from "../hooks/hooks";
import { type Learn, learnBreakdown, learnPeers, learnProfile, learnSpending, learnTrend } from "../learn";
import { BasketBreakdownView } from "./BasketBreakdownView";
import { BasketTrendView } from "./BasketTrendView";
import { MonthSwitcher, RangeSelector, SeeAll, Status } from "./controls";
import { LearnMore } from "./LearnMore";
import { PeerBenchmarkView } from "./PeerBenchmarkView";
import { SpenderProfileView } from "./SpenderProfileView";
import { SpendingSummaryView } from "./SpendingSummaryView";

/** A card followed by its "Did you know?" tip and next-step chips. */
function WithLearning({ api, learn, children }: { api: WidgetHostApi; learn: Learn; children: ReactNode }) {
  return (
    <View style={styles.stack}>
      {children}
      <LearnMore learn={learn} onNext={(s) => api.sendChat({ message: s.message })} />
    </View>
  );
}

export function BasketBreakdownWidget({ widget, api }: WidgetProps<BasketBreakdown>) {
  const b = useBasketBreakdown(api, widget.data);
  return (
    <WithLearning api={api} learn={learnBreakdown(b.data)}>
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
    </WithLearning>
  );
}

export function BasketTrendWidget({ widget, api }: WidgetProps<BasketTrend>) {
  const t = useBasketTrend(api, widget.data);
  return (
    <WithLearning api={api} learn={learnTrend(t.data)}>
      <BasketTrendView
        data={t.data}
        controls={
          <>
            <RangeSelector options={TREND_RANGES} value={t.months} loading={t.loading} onChange={t.setMonths} />
            <Status loading={t.loading} error={t.error} />
          </>
        }
      />
    </WithLearning>
  );
}

export function SpendingSummaryWidget({ widget, api }: WidgetProps<SpendingSummary>) {
  const s = useSpendingTransactions(api, widget.data);
  return (
    <WithLearning api={api} learn={learnSpending(widget.data)}>
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
    </WithLearning>
  );
}

export function SpenderProfileWidget({ widget, api }: WidgetProps<SpenderProfile>) {
  return (
    <WithLearning api={api} learn={learnProfile(widget.data)}>
      <SpenderProfileView data={widget.data} />
    </WithLearning>
  );
}

export function PeerBenchmarkWidget({ widget, api }: WidgetProps<PeerBenchmark>) {
  return (
    <WithLearning api={api} learn={learnPeers(widget.data)}>
      <PeerBenchmarkView data={widget.data} />
    </WithLearning>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
});
