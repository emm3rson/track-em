import React from "react";
import {
  Text as DefaultText,
  View as DefaultView,
  TextProps as DefaultTextProps,
  ViewProps as DefaultViewProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { effects } from "../styles/tokens";

export type TextProps = DefaultTextProps & {
  variant?: "default" | "muted" | "primary";
};

export function Text(props: TextProps) {
  const { style, variant = "default", ...otherProps } = props;
  const { colors, fontFamily } = useTheme();

  let color = colors.text;
  if (variant === "muted") color = colors.mutedText;
  if (variant === "primary") color = colors.primaryText;

  return <DefaultText style={[{ color, fontFamily }, style]} {...otherProps} />;
}

export type CardProps = DefaultViewProps & {
  variant?: "default" | "section" | "modal";
};

export function Card(props: CardProps) {
  const { style, variant = "default", children, ...otherProps } = props;
  const { colors } = useTheme();

  let borderRadius = 12;
  if (variant === "section") borderRadius = 14;
  if (variant === "modal") borderRadius = 16;

  const baseStyle: ViewStyle = {
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: variant === "section" ? colors.surfaceSection : colors.surface,
  };

  const shadowStyle: ViewStyle =
    variant === "default" || variant === "section" || variant === "modal"
      ? ({ boxShadow: effects.cardShadow } as ViewStyle)
      : {};

  return (
    <DefaultView
      style={[
        baseStyle,
        { borderRadius, overflow: variant === "section" ? "hidden" : "visible" },
        shadowStyle,
        style,
      ]}
      {...otherProps}
    >
      {children}
    </DefaultView>
  );
}

export function Screen(props: DefaultViewProps) {
  const { style, ...otherProps } = props;
  const { colors } = useTheme();

  return (
    <DefaultView style={[{ flex: 1, backgroundColor: colors.background }, style]} {...otherProps} />
  );
}

// Basic Views that just pass through but let us use one import
export function View(props: DefaultViewProps) {
  return <DefaultView {...props} />;
}
