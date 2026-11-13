import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { HeaderBar } from "@/components/HeaderBar";
import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/theme";

export default function AiScreen() {
  return (
    <Screen header={<HeaderBar title="AI" />}>
      <Card>
        <Text style={styles.text}>Moro moro! Kysy mitä vaan!</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: {
    padding: spacing.lg,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
