import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Polygon } from "react-native-svg";

import { Icon } from "./Icon";
import { colors, fontSize, iconSize, radius, spacing } from "@/theme";

const LINE_WIDTH = 2;
const DASH_PATTERN = "8 6";
const HOUSE_WIDTH = 260;
const ROOF_HEIGHT = 56;
const ROOF_POINTS = `0,${ROOF_HEIGHT} ${HOUSE_WIDTH / 2},0 ${HOUSE_WIDTH},${ROOF_HEIGHT}`;

export function BonusMeter() {
  return (
    <View style={styles.container}>
      <NextTierHeading />
      <NextTierLine />
      <CurrentTierRow />
    </View>
  );
}

function NextTierHeading() {
  return (
    <View>
      <Text style={styles.heading}>Seuraavaan tasoon 80,65 €</Text>
      <View style={styles.hint}>
        <Text style={styles.hintText}>Saatat jo olla seuraavalla bonustasolla</Text>
        <Icon name="information" size={iconSize.small} />
      </View>
    </View>
  );
}

function NextTierLine() {
  return (
    <View>
      <View style={styles.labels}>
        <Text style={styles.label}>1,5 %</Text>
        <Text style={styles.label}>200 €</Text>
      </View>
      <Svg height={LINE_WIDTH} width="100%">
        <Line
          x1="0"
          y1={LINE_WIDTH / 2}
          x2="100%"
          y2={LINE_WIDTH / 2}
          stroke={colors.primary}
          strokeWidth={LINE_WIDTH}
          strokeDasharray={DASH_PATTERN}
        />
      </Svg>
    </View>
  );
}

function CurrentTierRow() {
  return (
    <View style={styles.currentTier}>
      <TierSegment label="1,0 %" align="left" />
      <House>
        <Text style={styles.houseTitle}>Bonusta tulossa</Text>
        <Text style={styles.houseAmount}>
          1,19
          <Text style={styles.houseCurrency}> €</Text>
        </Text>
      </House>
      <TierSegment label="50 €" align="right" />
    </View>
  );
}

function TierSegment({ label, align }: { label: string; align: "left" | "right" }) {
  return (
    <View style={styles.segment}>
      <Text style={[styles.label, styles.strongLabel, { textAlign: align }]}>{label}</Text>
      <View style={styles.solidLine} />
    </View>
  );
}

function House({ children }: { children: ReactNode }) {
  return (
    <View>
      <Svg width={HOUSE_WIDTH} height={ROOF_HEIGHT}>
        <Polygon points={ROOF_POINTS} fill={colors.primary} />
      </Svg>
      <View style={styles.houseBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  heading: {
    textAlign: "center",
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.primary,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  hintText: {
    fontSize: fontSize.small,
    color: colors.primary,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: fontSize.title,
    color: colors.primary,
  },
  strongLabel: {
    fontWeight: "700",
  },
  currentTier: {
    flexDirection: "row",
    alignItems: "center",
  },
  segment: {
    flex: 1,
  },
  solidLine: {
    height: LINE_WIDTH,
    backgroundColor: colors.primary,
  },
  houseBody: {
    alignItems: "center",
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    backgroundColor: colors.primary,
  },
  houseTitle: {
    fontSize: fontSize.title,
    fontWeight: "600",
    color: colors.onPrimary,
  },
  houseAmount: {
    fontSize: fontSize.display,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  houseCurrency: {
    fontSize: fontSize.heading,
  },
});
