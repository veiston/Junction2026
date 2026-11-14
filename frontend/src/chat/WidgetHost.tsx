import type { Widget } from "../contracts-temp";
import { WidgetCard } from "../widgets/common/WidgetCard";
import { registry, type WidgetHostApi } from "./registry";

export function WidgetHost({ widget, api }: { widget: Widget; api: WidgetHostApi }) {
  const Component = registry[widget.type];
  if (!Component) {
    return (
      <WidgetCard>
        <p data-testid="widget-fallback">This view is coming soon.</p>
      </WidgetCard>
    );
  }
  return <Component widget={widget} api={api} />;
}
