import React from "react";
import { StyleSheet, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../../navigation/types";

import { FormLabel } from "../../../../components/ui/FormLabel";
import { ThemedSelect } from "../../../../components/ui/ThemedSelect";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { spacing } from "../../../../styles/tokens";
import { EntryAmountField } from "../components/EntryAmountField";
import { EntryAccountSelect } from "../components/EntryAccountSelect";
import { EntryDateField } from "../components/EntryDateField";
import { EntryModalLayout } from "../components/EntryModalLayout";
import { EntryTextField } from "../components/EntryTextField";
import { useAddPayableScreenController } from "../hooks/useAddPayableScreenController";
import { Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";

export function AddPayableScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryAddPayable">>();
  const scopedAccount = route.params?.scopedAccount;
  const {
    platform,
    setPlatform,
    monthIsoAnchor,
    setMonthIsoAnchor,
    dueDate,
    setDueDate,
    dueDateError,
    minDueDate,
    maxDueDate,
    monthOptions,
    categories,
    loadingCategories,
    categoryId,
    setCategoryId,
    accounts,
    preferredAccountId,
    setPreferredAccountId,
    amountText,
    setAmountText,
    amountError,
    saving,
    saveDisabled,
    cancel,
    submit,
  } = useAddPayableScreenController({ defaultMonth: route.params?.defaultMonth });

  return (
    <EntryModalLayout title="Add Payable" subtitle={scopedAccount?.accountName}>
      <EntryTextField
        label="Payee/Platform"
        value={platform}
        onChangeText={setPlatform}
        accessibilityLabel="Payee or platform"
        placeholder="e.g. Meralco, Maya Credit"
        autoCapitalize="words"
      />

      <View style={styles.group}>
        <FormLabel>Month</FormLabel>
        <ThemedSelect
          selectedValue={monthIsoAnchor}
          onValueChange={setMonthIsoAnchor}
          items={monthOptions}
          accessibilityLabel="Payable month"
        />
      </View>

      <EntryDateField
        label="Due date"
        value={dueDate}
        onChange={setDueDate}
        accessibilityLabel="Payable due date"
        optional
        placeholder="Not set"
        clearable
        clearAccessibilityLabel="Clear payable due date"
        minimumDate={minDueDate}
        maximumDate={maxDueDate}
      />
      {dueDateError ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{dueDateError}</Text>
      ) : null}

      <EntryAmountField
        value={amountText}
        onChangeText={setAmountText}
        accessibilityLabel="Payable amount"
        placeholder="e.g. 1800"
        error={amountText.trim() ? amountError : null}
      />

      <View style={styles.group}>
        <FormLabel optional>Expense Category</FormLabel>
        <ThemedSelect
          selectedValue={categoryId ?? "none"}
          onValueChange={(value) => setCategoryId(value === "none" ? null : (value as number))}
          items={[
            { label: "No category", value: "none" as number | "none" },
            ...categories.map((category) => ({
              label: category.name,
              value: category.id as number | "none",
            })),
          ]}
          placeholder={loadingCategories ? "Loading categories..." : "Select category"}
          accessibilityLabel="Payable category"
        />
      </View>

      <EntryAccountSelect
        label="Preferred payment account"
        optional
        accounts={accounts}
        leadingItems={[{ label: "No account", value: "none" as number | "none" }]}
        selectedValue={preferredAccountId ?? "none"}
        onValueChange={(value) =>
          setPreferredAccountId(value === "none" ? null : (value as number))
        }
        accessibilityLabel="Preferred payment account"
      />

      <ModalFormActions
        onCancel={cancel}
        onSubmit={() => void submit()}
        submitLabel={saving ? "Saving..." : "Save Payable"}
        submitAccessibilityLabel="Save payable"
        cancelAccessibilityLabel="Cancel payable entry"
        submitDisabled={saveDisabled}
        cancelDisabled={saving}
        submitLoading={saving}
      />
    </EntryModalLayout>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
});
