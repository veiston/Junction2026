import { useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { colors, radius, spacing } from "@/theme";

const DOT_SIZE = 10;

export function Pager({ pages }: { pages: ReactNode[] }) {
  // Pages must match the measured width, or pagingEnabled snaps to the wrong offsets
  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setPageWidth(event.nativeEvent.layout.width);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth === 0) {
      return;
    }
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  }

  return (
    <View onLayout={handleLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {pages.map((page, index) => (
          <View key={index} style={{ width: pageWidth }}>
            {page}
          </View>
        ))}
      </ScrollView>
      <PagerDots count={pages.length} activeIndex={activeIndex} />
    </View>
  );
}

function PagerDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === activeIndex;
        return <View key={index} style={[styles.dot, isActive && styles.activeDot]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.round,
    backgroundColor: colors.divider,
  },
  activeDot: {
    backgroundColor: colors.textSubtle,
  },
});
