import { useFocusEffect } from "expo-router";
import { setStatusBarStyle, type StatusBarStyle } from "expo-status-bar";
import { useCallback, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

type ScreenProps = {
  children: ReactNode;
  header?: ReactNode;
  hero?: ReactNode;
  topColor?: string;
  statusBarStyle?: StatusBarStyle;
};

export function Screen({
  children,
  header,
  hero,
  topColor = colors.surface,
  statusBarStyle = "dark",
}: ScreenProps) {
  // Tabs stay mounted, so the status bar style is applied on focus
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(statusBarStyle);
    }, [statusBarStyle]),
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: topColor }]}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {hero}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
});
