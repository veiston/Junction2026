import type { Basket } from "@/contracts";

/** Order is fixed by the contract: mandatory_regular, mandatory_irregular, everyday. */
export const BASKETS: Basket[] = ["mandatory_regular", "mandatory_irregular", "everyday"];

export const basketLabel: Record<Basket, string> = {
  mandatory_regular: "Mandatory & regular",
  mandatory_irregular: "Mandatory & irregular",
  everyday: "Everyday",
};

/** Short explanation shown under each basket (S-Bank's three-basket pedagogy). */
export const basketHint: Record<Basket, string> = {
  mandatory_regular: "Rent, bills, groceries, transport",
  mandatory_irregular: "Health, repairs, home: needed but surprising",
  everyday: "Cafés, eating out, fun: slips through fingers",
};

/** Colour per basket. Labels are always shown too, so colour is never the only cue. */
export const basketColor: Record<Basket, string> = {
  mandatory_regular: "#007A3D",
  mandatory_irregular: "#D99A00",
  everyday: "#3FB984",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" -> "Sep 2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** "2026-09" -> "Sep" */
export function monthShort(ym: string): string {
  return MONTHS[Number(ym.split("-")[1]) - 1];
}

/** Shift a YYYY-MM by n months. */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** 12.5 -> "12.5 %" ; null -> "–" */
export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "–" : `${value.toLocaleString("fi-FI")} %`;
}

/** Signed change: +12.3 % / −4 % / "new" when there was nothing before. */
export function changeText(change: number | null): string {
  if (change === null) return "new this month";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±";
  return `${sign}${Math.abs(change).toLocaleString("fi-FI")} % vs previous month`;
}
