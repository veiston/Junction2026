import { api } from "../api/client";
import { registry, type WidgetHostApi } from "../chat/registry";
import { WidgetHost } from "../chat/WidgetHost";
import { formatCents } from "../widgets/common/Money";
import type { Widget, WidgetType } from "../contracts-temp";
import { mocks } from "./mocks";

const hostApi: WidgetHostApi = {
  request: api.request,
  sendChat: (r) => console.info("sendChat", r),
  formatCents,
};

export function WidgetGallery() {
  const types = Object.keys(registry) as WidgetType[];
  return (
    <main className="gallery">
      <h1>Widget gallery</h1>
      {types.map((type) => {
        const data = mocks[type];
        const widget = { id: `gallery_${type}`, type, version: 1, data: (data ?? {}) as Widget["data"] } as Widget;
        return (
          <section key={type} aria-label={type}>
            <h2>{type}</h2>
            {data ? <WidgetHost widget={widget} api={hostApi} /> : <p>No mock for this widget yet.</p>}
          </section>
        );
      })}
    </main>
  );
}
