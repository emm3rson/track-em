import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Text } from "../../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { spacing, typography } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";

type EntryAmountFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  placeholder: string;
  error?: string | null;
  optional?: boolean;
  allowExpression?: boolean;
  rightActionIcon?: React.ReactNode;
  onPressRightAction?: () => void;
  rightActionAccessibilityLabel?: string;
};

export function EntryAmountField({
  label = "Amount",
  value,
  onChangeText,
  accessibilityLabel,
  placeholder,
  error = null,
  optional = false,
  allowExpression = false,
  rightActionIcon,
  onPressRightAction,
  rightActionAccessibilityLabel,
}: EntryAmountFieldProps) {
  const { colors } = useTheme();
  const inputStyle = getFieldInputStyle(colors);
  const showRightAction = !!rightActionIcon && !!onPressRightAction;

  return (
    <View style={styles.container}>
      <FormLabel optional={optional}>{label}</FormLabel>
      <FieldShell>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={accessibilityLabel}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholderText}
            keyboardType={allowExpression ? "numbers-and-punctuation" : "decimal-pad"}
            style={[inputStyle, styles.input]}
          />
          {showRightAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rightActionAccessibilityLabel}
              onPress={onPressRightAction}
              style={styles.rightActionButton}
              hitSlop={8}
            >
              {rightActionIcon}
            </Pressable>
          ) : null}
        </View>
      </FieldShell>
      {error ? <Text style={[styles.feedbackText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  feedbackText: {
    fontSize: typography.caption,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  input: {
    flex: 1,
  },
  rightActionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
