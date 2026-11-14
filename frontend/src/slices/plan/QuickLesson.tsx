import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { colors, fontSize, radius, spacing } from "@/theme";

const XP_PER_LESSON = 10;
const MIN_TOUCH_SIZE = 44;

export interface Lesson {
  question: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Plain-language explanation: shown first as a tip, and is what the quiz checks. */
  explanation: string;
}

/**
 * Teaches a money concept with the customer's own numbers. The tip comes first; the one-tap quiz
 * only appears when the customer asks for it.
 */
export function QuickLesson({ lesson }: { lesson: Lesson }) {
  const [quizOpen, setQuizOpen] = useState(false);
  return (
    <View style={styles.lesson} accessibilityLabel="Quick lesson">
      <View style={styles.tipRow}>
        <Icon name="lightbulb-on-outline" size={18} color={colors.primary} />
        <View style={styles.tipBody}>
          <Text style={styles.kicker}>Did you know?</Text>
          <Text style={styles.tip}>{lesson.explanation}</Text>
        </View>
      </View>
      {quizOpen ? (
        <Quiz lesson={lesson} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quiz me"
          onPress={() => setQuizOpen(true)}
          style={styles.quizButton}
        >
          <Text style={styles.quizButtonText}>Quiz me (+{XP_PER_LESSON} XP)</Text>
        </Pressable>
      )}
    </View>
  );
}

function Quiz({ lesson }: { lesson: Lesson }) {
  const [picked, setPicked] = useState<number | null>(null);
  const isAnswered = picked !== null;
  const isRight = picked === lesson.answer;
  return (
    <View style={styles.quiz}>
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
      {isAnswered && (
        <Text accessibilityLiveRegion="polite" style={[styles.verdict, isRight && styles.verdictRight]}>
          {isRight ? `Correct! +${XP_PER_LESSON} XP` : `Not quite: it's "${lesson.options[lesson.answer]}".`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lesson: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  tipRow: { flexDirection: "row", gap: spacing.sm },
  tipBody: { flex: 1, gap: 2 },
  kicker: { fontSize: fontSize.small - 2, fontWeight: "700", color: colors.primary },
  tip: { fontSize: fontSize.small - 1, lineHeight: 20, color: colors.text },
  quizButton: { alignSelf: "flex-start", minHeight: MIN_TOUCH_SIZE, justifyContent: "center", paddingHorizontal: spacing.xs },
  quizButtonText: { fontSize: fontSize.small - 1, fontWeight: "600", color: colors.primary },
  quiz: { gap: spacing.sm },
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
});
