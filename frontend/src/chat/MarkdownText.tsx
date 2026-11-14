import React from "react";
import {
  Linking,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";

import { coachColors, colors, fontSize, fonts, radius, spacing } from "@/theme";

export interface InlineNode {
  type: "text" | "bold" | "italic" | "boldItalic" | "code" | "strike" | "link";
  value?: string;
  text?: string;
  url?: string;
  children?: InlineNode[];
}

export type Block =
  | { type: "code"; language?: string; content: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "blockquote"; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "ordered_list"; items: { number: string; text: string }[] }
  | { type: "paragraph"; text: string };

export function parseInline(input: string): InlineNode[] {
  if (!input) return [];

  const nodes: InlineNode[] = [];
  let remaining = input;

  // Order matters: *** before ** before *; ___ before __ before _; code, strike, link
  const inlineRegex =
    /(\*\*\*(.+?)\*\*\*)|(___(.+?)___)|(\*\*(.+?)\*\*)|(__(.+?)__)|(\*(.+?)\*)|(_([^_]+)_)|(`([^`]+)`)|(~~(.+?)~~)|(\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      nodes.push({ type: "text", value: remaining });
      break;
    }

    if (match.index > 0) {
      nodes.push({ type: "text", value: remaining.slice(0, match.index) });
    }

    const fullMatch = match[0];
    if (match[1] || match[3]) {
      // Bold italic
      const inner = match[2] || match[4];
      nodes.push({ type: "boldItalic", children: parseInline(inner) });
    } else if (match[5] || match[7]) {
      // Bold
      const inner = match[6] || match[8];
      nodes.push({ type: "bold", children: parseInline(inner) });
    } else if (match[9] || match[11]) {
      // Italic
      const inner = match[10] || match[12];
      nodes.push({ type: "italic", children: parseInline(inner) });
    } else if (match[13]) {
      // Inline code
      const inner = match[14];
      nodes.push({ type: "code", value: inner });
    } else if (match[15]) {
      // Strikethrough
      const inner = match[16];
      nodes.push({ type: "strike", children: parseInline(inner) });
    } else if (match[17]) {
      // Link
      nodes.push({ type: "link", text: match[18], url: match[19] });
    }

    remaining = remaining.slice(match.index + fullMatch.length);
  }

  return nodes;
}

export function parseBlocks(content: string): Block[] {
  if (!content) return [];

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  let currentBlock: Block | null = null;

  const flushCurrentBlock = () => {
    if (currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code fence
    const codeFenceMatch = line.match(/^```(\w*)/);
    if (codeFenceMatch) {
      if (inCodeBlock) {
        blocks.push({
          type: "code",
          language: codeBlockLang,
          content: codeBlockLines.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
      } else {
        flushCurrentBlock();
        inCodeBlock = true;
        codeBlockLang = codeFenceMatch[1] || "";
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Check empty line
    if (line.trim() === "") {
      flushCurrentBlock();
      continue;
    }

    // Check headings
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushCurrentBlock();
      blocks.push({ type: "heading", level: 1, text: h1Match[1] });
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushCurrentBlock();
      blocks.push({ type: "heading", level: 2, text: h2Match[1] });
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushCurrentBlock();
      blocks.push({ type: "heading", level: 3, text: h3Match[1] });
      continue;
    }

    // Check blockquote
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) {
      if (currentBlock && currentBlock.type === "blockquote") {
        currentBlock.text += "\n" + bqMatch[1];
      } else {
        flushCurrentBlock();
        currentBlock = { type: "blockquote", text: bqMatch[1] };
      }
      continue;
    }

    // Check bullet list item: -, *, +, •
    const bulletMatch = line.match(/^\s*[-*+•]\s+(.+)$/);
    if (bulletMatch) {
      if (currentBlock && currentBlock.type === "bullet_list") {
        currentBlock.items.push(bulletMatch[1]);
      } else {
        flushCurrentBlock();
        currentBlock = { type: "bullet_list", items: [bulletMatch[1]] };
      }
      continue;
    }

    // Check ordered list item: 1. or 1)
    const orderedMatch = line.match(/^\s*(\d+)[\.)]\s+(.+)$/);
    if (orderedMatch) {
      if (currentBlock && currentBlock.type === "ordered_list") {
        currentBlock.items.push({ number: orderedMatch[1], text: orderedMatch[2] });
      } else {
        flushCurrentBlock();
        currentBlock = {
          type: "ordered_list",
          items: [{ number: orderedMatch[1], text: orderedMatch[2] }],
        };
      }
      continue;
    }

    // Regular text line -> append to current paragraph or start new
    if (currentBlock && currentBlock.type === "paragraph") {
      currentBlock.text += "\n" + line;
    } else {
      flushCurrentBlock();
      currentBlock = { type: "paragraph", text: line };
    }
  }

  if (inCodeBlock) {
    blocks.push({
      type: "code",
      language: codeBlockLang,
      content: codeBlockLines.join("\n"),
    });
  } else {
    flushCurrentBlock();
  }

  return blocks;
}

function renderInlineNodes(nodes: InlineNode[]): React.ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "bold":
        return (
          <Text key={i} style={styles.bold}>
            {renderInlineNodes(node.children || [])}
          </Text>
        );
      case "italic":
        return (
          <Text key={i} style={styles.italic}>
            {renderInlineNodes(node.children || [])}
          </Text>
        );
      case "boldItalic":
        return (
          <Text key={i} style={[styles.bold, styles.italic]}>
            {renderInlineNodes(node.children || [])}
          </Text>
        );
      case "code":
        return (
          <Text key={i} style={styles.inlineCode}>
            {node.value}
          </Text>
        );
      case "strike":
        return (
          <Text key={i} style={styles.strike}>
            {renderInlineNodes(node.children || [])}
          </Text>
        );
      case "link":
        return (
          <Text
            key={i}
            style={styles.link}
            accessibilityRole="link"
            onPress={() => {
              if (node.url) {
                Linking.openURL(node.url).catch(() => {});
              }
            }}
          >
            {node.text}
          </Text>
        );
    }
  });
}

interface MarkdownTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
}

export function MarkdownText({ content, style }: MarkdownTextProps) {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);

  if (!content) return null;

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "paragraph":
            return (
              <Text key={idx} style={[styles.paragraph, style]}>
                {renderInlineNodes(parseInline(block.text))}
              </Text>
            );
          case "heading": {
            const headingStyle =
              block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
            return (
              <Text key={idx} accessibilityRole="header" style={[headingStyle, style]}>
                {renderInlineNodes(parseInline(block.text))}
              </Text>
            );
          }
          case "bullet_list":
            return (
              <View key={idx} style={styles.list}>
                {block.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={[styles.listItemText, style]}>
                      {renderInlineNodes(parseInline(item))}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case "ordered_list":
            return (
              <View key={idx} style={styles.list}>
                {block.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={styles.listItem}>
                    <Text style={styles.number}>{item.number}.</Text>
                    <Text style={[styles.listItemText, style]}>
                      {renderInlineNodes(parseInline(item.text))}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case "blockquote":
            return (
              <View key={idx} style={styles.blockquote}>
                <Text style={[styles.blockquoteText, style]}>
                  {renderInlineNodes(parseInline(block.text))}
                </Text>
              </View>
            );
          case "code":
            return (
              <View key={idx} style={styles.codeBlock}>
                <Text style={styles.codeBlockText}>{block.content}</Text>
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  paragraph: {
    fontSize: fontSize.small,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },
  bold: {
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  h1: {
    fontSize: fontSize.title,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 26,
  },
  h2: {
    fontSize: fontSize.body,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 24,
  },
  h3: {
    fontSize: fontSize.small,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 22,
  },
  list: {
    gap: spacing.xs,
    marginVertical: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bullet: {
    fontSize: fontSize.small,
    color: colors.primary,
    lineHeight: 22,
  },
  number: {
    fontSize: fontSize.small,
    fontFamily: fonts.medium,
    color: colors.primary,
    lineHeight: 22,
    minWidth: 18,
  },
  listItemText: {
    flex: 1,
    fontSize: fontSize.small,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
  },
  blockquoteText: {
    fontSize: fontSize.small,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontStyle: "italic",
    lineHeight: 22,
  },
  inlineCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: fontSize.small - 1,
    backgroundColor: coachColors.surfaceMuted,
    color: colors.primary,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: coachColors.surfaceMuted,
    borderColor: coachColors.border,
    borderWidth: 1,
    borderRadius: radius.card / 2,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  codeBlockText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: fontSize.small - 2,
    color: colors.text,
  },
  strike: {
    textDecorationLine: "line-through",
  },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
