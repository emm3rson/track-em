import React from "react";
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native";

import { components } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Themed";
import { PrimaryButton } from "./PrimaryButton";

type ModalFormActionsProps = {
  onCancel: () => void;
  onSubmit: () => void;
  onSecondarySubmit?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  secondarySubmitLabel?: string;
  cancelAccessibilityLabel?: string;
  submitAccessibilityLabel?: string;
  secondarySubmitAccessibilityLabel?: string;
  cancelDisabled?: boolean;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  cancelTextStyle?: StyleProp<TextStyle>;
};

export function ModalFormActions({
  onCancel,
  onSubmit,
  onSecondarySubmit,
  cancelLabel = "Cancel",
  submitLabel = "Save",
  secondarySubmitLabel,
  cancelAccessibilityLabel,
  submitAccessibilityLabel,
  secondarySubmitAccessibilityLabel,
  cancelDisabled = false,
  submitDisabled = false,
  submitLoading = false,
  style,
  cancelTextStyle,
}: ModalFormActionsProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: components.formActionRowGap,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cancelAccessibilityLabel ?? cancelLabel}
        onPress={onCancel}
        disabled={cancelDisabled || submitLoading}
        style={{ padding: components.formActionPadding }}
      >
        <Text style={[{ fontWeight: "700", color: colors.text }, cancelTextStyle]}>
          {cancelLabel}
        </Text>
      </Pressable>

      {onSecondarySubmit && secondarySubmitLabel && (
        <PrimaryButton
          accessibilityRole="button"
          accessibilityLabel={secondarySubmitAccessibilityLabel ?? secondarySubmitLabel}
          onPress={onSecondarySubmit}
          disabled={submitDisabled || submitLoading}
          loading={submitLoading}
          style={{ paddingHorizontal: 24 }}
        >
          {secondarySubmitLabel}
        </PrimaryButton>
      )}

      <PrimaryButton
        accessibilityRole="button"
        accessibilityLabel={submitAccessibilityLabel ?? submitLabel}
        onPress={onSubmit}
        disabled={submitDisabled || submitLoading}
        loading={submitLoading}
        style={{ paddingHorizontal: 24 }}
      >
        {submitLabel}
      </PrimaryButton>
    </View>
  );
}
