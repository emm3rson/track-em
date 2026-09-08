import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { PrimaryButton } from "./ui/PrimaryButton";
import { Text } from "./Themed";
import { radius } from "../styles/tokens";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
  embedded?: boolean;
  align?: "left" | "center";
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
  style,
  embedded = false,
  align = "left",
}: EmptyStateProps) {
  const { colors } = useTheme();
  const alignItems = align === "center" ? "center" : "flex-start";

  return (
    <View
      style={[
        {
          alignItems,
          gap: embedded ? 8 : 10,
          padding: embedded ? 0 : 16,
          backgroundColor: embedded ? "transparent" : colors.surfaceAlt,
          borderRadius: embedded ? 0 : radius.md,
        },
        style,
      ]}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: embedded ? 16 : 17, fontWeight: "800", textAlign: align }}>
          {title}
        </Text>
        <Text style={{ color: colors.mutedText, textAlign: align }}>{description}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <PrimaryButton
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          borderRadius={radius.pill}
          style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 40 }}
        >
          {actionLabel}
        </PrimaryButton>
      ) : null}
    </View>
  );
}
