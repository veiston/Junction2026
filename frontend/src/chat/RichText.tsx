import { StyleSheet, Text, View, type TextStyle } from "react-native";

import { spacing } from "@/theme";

/** "a **b** c" -> [["a ", false], ["b", true], [" c", false]]. Leftover "*" markers are dropped. */
export function parseBold(line: string): [string, boolean][] {
  const parts: [string, boolean][] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) parts.push([line.slice(last, m.index), false]);
    parts.push([m[1], true]);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push([line.slice(last), false]);
  return parts
    .map(([t, b]) => [t.replace(/\*+/g, ""), b] as [string, boolean])
    .filter(([t]) => t.length > 0);
}

const BULLET = /^\s*(?:[-*•]|\d+\.)\s+/;

/**
 * Minimal, safe rendering of the coach's text: **bold**, "- " bullets and paragraphs.
 * Anything else stays plain text (no links, no HTML).
 */
export function RichText({ text, style }: { text: string; style: TextStyle }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.split("\n").map((l) => l.replace(/^#{1,6}\s+/, "")).filter((l) => l.trim() !== ""))
    .filter((b) => b.length > 0);

  const line = (l: string, key: string) => (
    <Text key={key} style={style}>
      {parseBold(l).map(([t, bold], i) => (
        <Text key={i} style={bold ? styles.bold : undefined}>
          {t}
        </Text>
      ))}
    </Text>
  );

  return (
    <View style={styles.blocks}>
      {blocks.map((b, bi) => (
        <View key={bi} style={styles.block}>
          {b.map((l, li) =>
            BULLET.test(l) ? (
              <View key={li} style={styles.bulletRow}>
                <Text style={style}>•</Text>
                <View style={styles.bulletText}>{line(l.replace(BULLET, ""), `${bi}-${li}`)}</View>
              </View>
            ) : (
              line(l, `${bi}-${li}`)
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.sm },
  block: { gap: 2 },
  bold: { fontWeight: "700" },
  bulletRow: { flexDirection: "row", gap: spacing.xs },
  bulletText: { flex: 1 },
});
