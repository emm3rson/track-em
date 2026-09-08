import React from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { spacing } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";

type EntryTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  placeholder: string;
  optional?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

export function EntryTextField({
  label,
  value,
  onChangeText,
  accessibilityLabel,
  placeholder,
  optional = false,
  autoCapitalize = "sentences",
}: EntryTextFieldProps) {
  const { colors } = useTheme();
  const inputStyle = getFieldInputStyle(colors);

  return (
    <View style={styles.container}>
      <FormLabel optional={optional}>{label}</FormLabel>
      <FieldShell>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholderText}
          autoCapitalize={autoCapitalize}
          style={inputStyle}
        />
      </FieldShell>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
