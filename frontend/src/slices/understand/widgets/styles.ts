import { StyleSheet } from "react-native";

import { colors, fontSize, spacing } from "@/theme";

/** Shared look of the understand widgets (on top of the foundation WidgetCard). */
export const u = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  big: { fontSize: fontSize.title, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  body: { fontSize: fontSize.small, color: colors.text },
  muted: { fontSize: fontSize.small - 2, color: colors.textMuted },
  subtle: { fontSize: fontSize.small - 3, color: colors.textSubtle },
  strong: { fontSize: fontSize.small, fontWeight: "600", color: colors.text },
  dot: { width: 12, height: 12, borderRadius: 6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginVertical: spacing.xs },
  link: { minHeight: 44, justifyContent: "center", paddingVertical: spacing.sm },
  linkText: { fontSize: fontSize.small, color: colors.primary, fontWeight: "600" },
});
