import type { SliceWidgets } from "@/contracts/widget-registry";
import { widgets as habits } from "@/slices/habits";
import { widgets as plan } from "@/slices/plan";
import { widgets as understand } from "@/slices/understand";
import { ConceptNote } from "@/widgets/common/ConceptNote";
import { TransactionList } from "@/widgets/common/TransactionList";

export type { SliceWidgets, WidgetComponent, WidgetHostApi, WidgetProps } from "@/contracts/widget-registry";

/** Foundation widgets first; slices register only the types they own. */
export const registry: SliceWidgets = {
  transaction_list: TransactionList,
  concept_note: ConceptNote,
  ...understand,
  ...plan,
  ...habits,
};
