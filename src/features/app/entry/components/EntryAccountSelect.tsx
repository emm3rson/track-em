import React from "react";
import { StyleSheet, View } from "react-native";

import { AccountSelect, type AccountSelectOption } from "../../../../components/ui/AccountSelect";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { spacing } from "../../../../styles/tokens";

type EntryAccountSelectProps<T extends number | string> = {
  label: string;
  accounts: AccountSelectOption[];
  selectedValue: T | undefined;
  onValueChange: (value: T) => void;
  leadingItems?: { label: string; value: T }[];
  labelFn?: (account: AccountSelectOption) => string;
  accessibilityLabel: string;
  optional?: boolean;
  placeholder?: string;
};

export function EntryAccountSelect<T extends number | string>({
  label,
  accounts,
  selectedValue,
  onValueChange,
  leadingItems,
  labelFn,
  accessibilityLabel,
  optional = false,
  placeholder,
}: EntryAccountSelectProps<T>) {
  return (
    <View style={styles.container}>
      <FormLabel optional={optional}>{label}</FormLabel>
      <AccountSelect
        accounts={accounts}
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        leadingItems={leadingItems}
        labelFn={labelFn}
        accessibilityLabel={accessibilityLabel}
        placeholder={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
