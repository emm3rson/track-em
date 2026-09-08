import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Text } from "../../../../components/Themed";
import { FieldShell } from "../../../../components/ui/FieldShell";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { spacing, typography } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";

type EntryDateFieldProps = {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  accessibilityLabel: string;
  optional?: boolean;
  placeholder?: string;
  clearable?: boolean;
  clearAccessibilityLabel?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function EntryDateField({
  label,
  value,
  onChange,
  accessibilityLabel,
  optional = false,
  placeholder = "Select date",
  clearable = false,
  clearAccessibilityLabel = "Clear date",
  minimumDate,
  maximumDate,
}: EntryDateFieldProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.container}>
      <FormLabel optional={optional}>{label}</FormLabel>

      <FieldShell
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => setShowPicker(true)}
          style={styles.pressable}
        >
          <Text style={{ color: value ? colors.text : colors.placeholderText }}>
            {value ? value.toLocaleDateString("en-PH") : placeholder}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            onPress={() => onChange(null)}
            style={styles.clearButton}
          >
            <Text style={[styles.clearLabel, { color: colors.danger }]}>Clear</Text>
          </Pressable>
        ) : null}
      </FieldShell>

      {showPicker ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_event, nextDate) => {
            setShowPicker(false);
            if (nextDate) {
              onChange(nextDate);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  pressable: {
    flex: 1,
    minHeight: 20,
    justifyContent: "center",
  },
  clearButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearLabel: {
    fontSize: typography.body,
    fontWeight: "700",
  },
});
