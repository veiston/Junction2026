import type { ComponentType } from "react";
import type { ChatRequest, Widget, WidgetType } from "../contracts-temp";
import { TransactionList } from "../widgets/common/TransactionList";
import { widgets as understand } from "../slices/understand";
import { widgets as plan } from "../slices/plan";
import { widgets as habits } from "../slices/habits";

// Mirrors contracts/interfaces/frontend/widget-registry.ts.
export interface WidgetHostApi {
  request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T>;
  sendChat(request: ChatRequest): void;
  formatCents(cents: number): string;
}
export interface WidgetProps<TData = unknown> {
  widget: Widget & { data: TData };
  api: WidgetHostApi;
}
export type WidgetComponent<TData = unknown> = ComponentType<WidgetProps<TData>>;
export type SliceWidgets = Partial<Record<WidgetType, WidgetComponent<any>>>;

export const registry: SliceWidgets = {
  transaction_list: TransactionList,
  ...understand,
  ...plan,
  ...habits,
};
