import React from "react";
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native";

import { getPillOutlineStyle, getPillOutlineTextStyle } from "../../styles/buttons";
import { components } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Themed";

type InlinePillActionProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function InlinePillAction({
  label,
  onPress,
  disabled = false,
  compact = false,
  accessibilityLabel,
  icon,
  style,
  textStyle,
}: InlinePillActionProps) {
  const { colors } = useTheme();
  const verticalPadding = compact
    ? components.inlinePillCompactPaddingVertical
    : components.inlinePillPaddingVertical;
  const horizontalPadding = compact
    ? components.inlinePillCompactPaddingHorizontal
    : components.inlinePillPaddingHorizontal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled}
      style={[
        getPillOutlineStyle(colors),
        {
          paddingVertical: verticalPadding,
          paddingHorizontal: horizontalPadding,
          opacity: disabled ? 0.65 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        style,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      <Text style={[getPillOutlineTextStyle(colors), textStyle]}>{label}</Text>
    </Pressable>
  );
}
