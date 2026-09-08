import { TextStyle, ViewStyle } from "react-native";

import type { ThemeColors } from "../theme/colors";
import { getActionShadowStyle, getSecondaryActionShadowStyle } from "./shadows";

export function getPrimaryButtonStyle(colors: ThemeColors, radius = 12): ViewStyle {
  return {
    backgroundColor: colors.primaryBg,
    borderWidth: 0,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    ...getActionShadowStyle(colors),
  };
}

export function getPrimaryButtonTextStyle(colors: ThemeColors): TextStyle {
  return {
    color: colors.primaryText,
    fontWeight: "700",
  };
}

export function getPillOutlineStyle(colors: ThemeColors): ViewStyle {
  return {
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    ...getSecondaryActionShadowStyle(colors),
  };
}

export function getSecondaryIconButtonStyle(colors: ThemeColors): ViewStyle {
  return {
    padding: 10,
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    ...getSecondaryActionShadowStyle(colors),
  };
}

export function getPillOutlineTextStyle(colors: ThemeColors): TextStyle {
  return {
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  };
}
