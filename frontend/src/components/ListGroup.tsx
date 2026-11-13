import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Card } from "./Card";
import { colors, iconSize, spacing } from "@/theme";

const DIVIDER_INSET = spacing.md + iconSize.row + spacing.md;

export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);

  return (
    <Card>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: DIVIDER_INSET,
    backgroundColor: colors.divider,
  },
});
