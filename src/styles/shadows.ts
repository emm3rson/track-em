import { ViewStyle } from "react-native";

import { ThemeColors } from "../theme/colors";

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const isDarkTheme = (colors: ThemeColors) => {
  const { r, g, b } = hexToRgb(colors.background);
  // Perceived luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 120;
};

export const getFieldShadowStyle = (colors: ThemeColors): ViewStyle => {
  const dark = isDarkTheme(colors);
  return {
    boxShadow: `0px 1px ${dark ? 6 : 4}px rgba(0, 0, 0, ${dark ? 0.08 : 0.04})`,
  } as ViewStyle; // We may need to cast since RN typings for boxShadow might be partial depending on version, but it's supported in New Arch/Expo
};

export const getActionShadowStyle = (colors: ThemeColors): ViewStyle => {
  const dark = isDarkTheme(colors);
  return {
    boxShadow: `0px 2px ${dark ? 8 : 6}px rgba(0, 0, 0, ${dark ? 0.1 : 0.05})`,
  } as ViewStyle;
};

export const getSecondaryActionShadowStyle = (colors: ThemeColors): ViewStyle => {
  const dark = isDarkTheme(colors);
  return {
    boxShadow: `0px 1px ${dark ? 4 : 3}px rgba(0, 0, 0, ${dark ? 0.07 : 0.03})`,
  } as ViewStyle;
};
