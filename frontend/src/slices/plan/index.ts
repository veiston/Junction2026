import type { SliceWidgets } from "@/contracts/widget-registry";

import { BalanceForecast } from "./BalanceForecast";
import { ExpenseAlerts } from "./ExpenseAlerts";
import { SafeToSpend } from "./SafeToSpend";
import { UpcomingBills } from "./UpcomingBills";
import { WhatIf } from "./WhatIf";

export const widgets: SliceWidgets = {
  balance_forecast: BalanceForecast,
  upcoming_bills: UpcomingBills,
  expense_alerts: ExpenseAlerts,
  safe_to_spend: SafeToSpend,
  what_if: WhatIf,
};
