// TEMPORARY hand-written subset of contracts/dto. Delete on rebase once src/contracts/ is generated.
export type Cents = number;
export type Basket = "mandatory_regular" | "mandatory_irregular" | "everyday";
export type Flow = "income" | "spending" | "saving" | "transfer";
export type QuickAction = "understand_my_money" | "plan_my_finances" | "improve_my_habits";

export interface Period { from_date: string; to_date: string }
export interface Source { description: string; period: Period; tx_count: number; external_url: string | null }

export interface Transaction {
  id: number; date: string; timestamp: string; category: string; spend_group: string; label: string;
  amount_cents: Cents; balance_after_cents: Cents; flow: Flow; basket: Basket | null;
  merchant_id: string | null; mcc: string | null;
}
export interface TransactionFilter {
  from_date?: string; to_date?: string; basket?: Basket; category?: string; spend_group?: string;
  flow?: Flow; min_abs_amount_cents?: number;
}
export interface TransactionPage {
  items: Transaction[]; page: number; page_size: number; total: number; total_amount_cents: Cents;
}
export interface TransactionListData { title: string; filter: TransactionFilter; page: TransactionPage }

export type WidgetType =
  | "transaction_list" | "basket_breakdown" | "basket_trend" | "spending_summary" | "spender_profile"
  | "peer_benchmark" | "balance_forecast" | "upcoming_bills" | "expense_alerts" | "safe_to_spend" | "what_if"
  | "limit_suggestion" | "limit_progress" | "limit_review" | "challenge_suggestions" | "challenge_progress";
export interface Widget { id: string; type: WidgetType; version: 1; data: Record<string, unknown> }

export interface ChatRequest { conversation_id?: string | null; message?: string | null; quick_action?: QuickAction | null }
export interface AssistantMessage {
  id: string; role: "assistant"; created_at: string; text: string; widgets: Widget[];
  suggestions: string[]; sources: Source[]; disclaimer: string | null;
}

export type ErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHORIZED" | "TOKEN_EXPIRED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"
  | "RATE_LIMITED" | "LLM_UNAVAILABLE" | "NOT_IMPLEMENTED" | "INTERNAL_ERROR";
export interface ErrorBody { code: ErrorCode; message: string; details: { field: string; issue: string }[]; request_id: string }
export interface ErrorResponse { error: ErrorBody }
