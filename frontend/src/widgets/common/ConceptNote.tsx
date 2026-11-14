import { StyleSheet, Text, View } from "react-native";

import type { ConceptNote as ConceptNoteData } from "@/contracts";
import type { WidgetProps } from "@/chat/registry";
import { coachColors, colors, fonts, radius, spacing } from "@/theme";

/** Inline form, reused by the habits widgets. */
export function ConceptNoteBody({ note }: { note: ConceptNoteData }) {
  return (
    <View style={styles.card} accessibilityLabel={`Learn: ${note.title}`} testID={`concept-${note.id}`}>
      <Text style={styles.label}>Learn</Text>
      <Text style={styles.title} accessibilityRole="header">
        {note.title}
      </Text>
      <Text style={styles.text}>{note.text}</Text>
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
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 22 },
});
