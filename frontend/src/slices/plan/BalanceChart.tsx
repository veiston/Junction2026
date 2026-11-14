import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline } from "react-native-svg";

import type { IsoDate, TrendPoint } from "@/contracts";
import { colors, fontSize } from "@/theme";

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;
const CHART_PADDING = 8;
const LINE_WIDTH = 2.5;
const MARK_RADIUS = 5;
const EVENT_RADIUS = 3.5;
const MARK_COLOR = "#C0392B";
const AREA_OPACITY = 0.1;
const ZERO_DASH = "4 4";

export const BASELINE_COLOR = colors.textSubtle;
export const ADJUSTED_COLOR = colors.primary;
export const BILL_COLOR = colors.warning;
export const INCOME_COLOR = colors.brand;

export interface ChartSeries {
  points: TrendPoint[];
  color: string;
}

/** A day that moves the balance: a bill (dip) or income (jump). */
export interface ChartEvent {
  date: IsoDate;
  kind: "bill" | "income";
}

interface Props {
  series: ChartSeries[];
  /** Date of the point to mark (looked up in the first series). */
  markedDate?: IsoDate;
  /** Bill and income days, drawn as dots on the first series. */
  events?: ChartEvent[];
  label: string;
}

interface Scale {
  min: number;
  max: number;
  lastIndex: number;
}

/** "2026-09-05" -> "5.9." (Finnish short date, no timezone surprises). */
export function shortDate(iso: IsoDate): string {
  const [, month, day] = iso.split("-");
  return `${Number(day)}.${Number(month)}.`;
}

/** Maps value from [min, max] to [0, size]; a flat range sits in the middle. */
function scaleValue(value: number, min: number, max: number, size: number): number {
  const span = max - min;
  if (span === 0) {
    return size / 2;
  }
  return ((value - min) / span) * size;
}

function toScale(series: ChartSeries[]): Scale {
  const balances = series.flatMap((s) => s.points.map((p) => p.balance_cents));
  const lastIndex = Math.max(...series.map((s) => s.points.length - 1));
  return { min: Math.min(...balances), max: Math.max(...balances), lastIndex };
}

function toX(index: number, scale: Scale): number {
  const innerWidth = CHART_WIDTH - 2 * CHART_PADDING;
  return CHART_PADDING + scaleValue(index, 0, scale.lastIndex, innerWidth);
}

function toY(balance: number, scale: Scale): number {
  const innerHeight = CHART_HEIGHT - 2 * CHART_PADDING;
  return CHART_HEIGHT - CHART_PADDING - scaleValue(balance, scale.min, scale.max, innerHeight);
}

function toPolyline(points: TrendPoint[], scale: Scale): string {
  return points.map((p, index) => `${toX(index, scale)},${toY(p.balance_cents, scale)}`).join(" ");
}

/** The line closed down to the chart floor, for the soft fill under it. */
function toArea(points: TrendPoint[], scale: Scale): string {
  const floor = CHART_HEIGHT - CHART_PADDING;
  const lastX = toX(points.length - 1, scale);
  return `${toX(0, scale)},${floor} ${toPolyline(points, scale)} ${lastX},${floor}`;
}

function crossesZero(scale: Scale): boolean {
  return scale.min < 0 && scale.max > 0;
}

function EventDots({ points, events, scale }: { points: TrendPoint[]; events: ChartEvent[]; scale: Scale }) {
  return (
    <>
      {events.map((event) => {
        const index = points.findIndex((p) => p.date === event.date);
        if (index < 0) {
          return null;
        }
        let fill = BILL_COLOR;
        if (event.kind === "income") {
          fill = INCOME_COLOR;
        }
        return (
          <Circle
            key={`${event.kind}-${event.date}`}
            cx={toX(index, scale)}
            cy={toY(points[index].balance_cents, scale)}
            r={EVENT_RADIUS}
            fill={fill}
            stroke={colors.surface}
            strokeWidth={1}
          />
        );
      })}
    </>
  );
}

export function BalanceChart({ series, markedDate, events = [], label }: Props) {
  const isEmpty = series.every((s) => s.points.length === 0);
  if (isEmpty) {
    return null;
  }
  const scale = toScale(series);
  const first = series[0].points;
  const markedIndex = first.findIndex((p) => p.date === markedDate);
  const hasMark = markedIndex >= 0;
  const zeroY = toY(0, scale);

  return (
    <View style={styles.chart}>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} accessibilityLabel={label}>
        <Polygon points={toArea(first, scale)} fill={series[0].color} fillOpacity={AREA_OPACITY} />
        {crossesZero(scale) && (
          <Line x1={0} x2={CHART_WIDTH} y1={zeroY} y2={zeroY} stroke={MARK_COLOR} strokeDasharray={ZERO_DASH} />
        )}
        {series.map((s) => (
          <Polyline
            key={s.color}
            points={toPolyline(s.points, scale)}
            fill="none"
            stroke={s.color}
            strokeWidth={LINE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <EventDots points={first} events={events} scale={scale} />
        {hasMark && (
          <Circle
            cx={toX(markedIndex, scale)}
            cy={toY(first[markedIndex].balance_cents, scale)}
            r={MARK_RADIUS}
            fill={MARK_COLOR}
          />
        )}
      </Svg>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{shortDate(first[0].date)}</Text>
        <Text style={styles.axisText}>{shortDate(first[first.length - 1].date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { width: "100%" },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  axisText: { fontSize: fontSize.small - 3, color: colors.textSubtle },
});
