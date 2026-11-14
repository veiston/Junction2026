import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, spacing } from "@/theme";

const XP_PER_LESSON = 10;
const MIN_TOUCH_SIZE = 44;

export interface Lesson {
  question: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Plain-language explanation shown after any pick. */
  explanation: string;
}

/** One-tap quiz that teaches a money concept with the customer's own numbers. */
export function QuickLesson({ lesson }: { lesson: Lesson }) {
  const [picked, setPicked] = useState<number | null>(null);
  const isAnswered = picked !== null;
  const isRight = picked === lesson.answer;

  return (
    <View style={styles.lesson} accessibilityLabel="Quick lesson">
      <Text style={styles.kicker}>Quick lesson · +{XP_PER_LESSON} XP</Text>
      <Text style={styles.question}>{lesson.question}</Text>
      {lesson.options.map((option, index) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          disabled={isAnswered}
          onPress={() => setPicked(index)}
          style={[styles.option, isAnswered && index === lesson.answer && styles.optionRight]}
        >
          <Text style={styles.optionText}>{option}</Text>
        </Pressable>
      ))}
      {isAnswered && <LessonResult isRight={isRight} lesson={lesson} />}
    </View>
  );
}

function LessonResult({ isRight, lesson }: { isRight: boolean; lesson: Lesson }) {
  let verdict = `Not quite: it's "${lesson.options[lesson.answer]}".`;
  if (isRight) {
    verdict = `Correct! +${XP_PER_LESSON} XP`;
  }
  return (
    <View accessibilityLiveRegion="polite">
      <Text style={[styles.verdict, isRight && styles.verdictRight]}>{verdict}</Text>
      <Text style={styles.explanation}>{lesson.explanation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lesson: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  kicker: { fontSize: fontSize.small - 3, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  question: { fontSize: fontSize.small, fontWeight: "600", color: colors.text },
  option: {
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  optionRight: { borderColor: colors.primary, borderWidth: 2 },
  optionText: { fontSize: fontSize.small, color: colors.text },
  verdict: { fontSize: fontSize.small, fontWeight: "700", color: colors.warning },
  verdictRight: { color: colors.primary },
  explanation: { fontSize: fontSize.small - 2, color: colors.textMuted },
});
