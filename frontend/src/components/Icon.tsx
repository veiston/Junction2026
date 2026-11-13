import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { colors, iconSize } from "@/theme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = iconSize.row, color = colors.primary }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
