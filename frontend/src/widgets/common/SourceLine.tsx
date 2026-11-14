import { StyleSheet, Text } from "react-native";

import type { Source } from "@/contracts";
import { colors, fontSize } from "@/theme";

export function SourceLine({ source }: { source: Source }) {
  return (
    <Text style={styles.line}>
      {source.description} · {source.period.from_date} – {source.period.to_date} · {source.tx_count} transactions
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: fontSize.small - 3, color: colors.textSubtle },
});
