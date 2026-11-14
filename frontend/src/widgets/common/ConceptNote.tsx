import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import type { ConceptNote as ConceptNoteData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

/** Inline form, reused by the habits widgets. */
export function ConceptNoteBody({ note, collapsed = false }: { note: ConceptNoteData; collapsed?: boolean }) {
  const [expanded, setExpanded] = useState(!collapsed);
  return (
    <View style={[styles.card, collapsed && styles.compactCard]} testID={`concept-${note.id}`}>
      <Pressable
        accessibilityLabel={`Learn: ${note.title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.trigger}
      >
        <Icon name="lightbulb-on-outline" size={16} />
        <Text style={styles.label}>Learn</Text>
        <Text numberOfLines={1} style={styles.title} accessibilityRole="header">
          {note.title}
        </Text>
      </Pressable>
      {expanded ? <Text style={styles.text}>{note.text}</Text> : null}
    </View>
  );
}

export function ConceptNote({ widget }: WidgetProps<ConceptNoteData>) {
  const d = widget.data;
  if (!d?.title) return null;
  return <ConceptNoteBody note={d} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: coachColors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  compactCard: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: "transparent",
  },
  trigger: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text, lineHeight: 19 },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 19 },
});
