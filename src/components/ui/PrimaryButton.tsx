import React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { getPrimaryButtonStyle, getPrimaryButtonTextStyle } from "../../styles/buttons";
import { radius, opacities } from "../../styles/tokens";
import { Text } from "../Themed";

const DEFAULT_PADDING = 12;

export type PrimaryButtonProps = Omit<PressableProps, "style" | "children"> & {
  /** Button label or custom content. When a string, rendered with primary text style. */
  children: React.ReactNode;
  /** Optional style merged with the default primary button style. */
  style?: StyleProp<ViewStyle>;
  /** Optional text style applied when children is a string. */
  textStyle?: StyleProp<TextStyle>;
  /** When true, reduces opacity to indicate loading. Caller typically sets children to e.g. "Saving...". */
  loading?: boolean;
  /** Border radius. Default 12; use radius.pill (999) for pill shape. */
  borderRadius?: number;
};

export function PrimaryButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  borderRadius = radius.md,
  accessibilityRole = "button",
  ...rest
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const isString = typeof children === "string";
  const baseContainerStyle = getPrimaryButtonStyle(colors, borderRadius);

  const containerStyle: StyleProp<ViewStyle> = [
    baseContainerStyle,
    { padding: DEFAULT_PADDING },
    loading ? { opacity: opacities.loading } : null,
    disabled ? { opacity: opacities.loading } : null,
    style,
  ];

  const labelStyle = getPrimaryButtonTextStyle(colors);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      style={containerStyle}
      {...rest}
    >
      {isString ? <Text style={[labelStyle, textStyle]}>{children}</Text> : children}
    </Pressable>
  );
}
