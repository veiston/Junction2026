import { StyleSheet, Text } from "react-native";

import type { Source } from "@/contracts";
import { colors, fontSize } from "@/theme";

export function SourceLine({ source }: { source: Source }) {
  if (source.tx_count === 0) return null;
  return (
    <Text style={styles.line}>
      {`Based on ${source.tx_count} ${source.tx_count === 1 ? "transaction" : "transactions"} of yours`}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: fontSize.small - 3, color: colors.textSubtle },
});
