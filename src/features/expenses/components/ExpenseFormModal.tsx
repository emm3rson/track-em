import React from "react";
import { Pressable, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { AccountSelect } from "../../../components/ui/AccountSelect";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { FormLabel } from "../../../components/ui/FormLabel";
import { ModalFormActions } from "../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import type { OverflowMenuItem } from "../../../components/ui/ModalOverflowMenu";
import { ThemedSelect } from "../../../components/ui/ThemedSelect";
import { php } from "../../../utils/currency";
import { useTheme } from "../../../theme/ThemeProvider";
import type { ExpenseCategory } from "../types";
import type { ExpenseAccount } from "../../app/expenses/types";

type ExpenseFormModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  expenseDate: Date;
  showDate: boolean;
  amountText: string;
  amountError: string | null;
  categoryId: number | null;
  expenseAccountId: number | null;
  note: string;
  visibleCategories: ExpenseCategory[];
  accounts: ExpenseAccount[];
  historicalAccount: { id: number; name: string } | null;
  saveDisabled: boolean;
  saving: boolean;
  actions: OverflowMenuItem[];
  onSetShowDate: (value: boolean) => void;
  onSetExpenseDate: (date: Date) => void;
  onSetAmountText: (value: string) => void;
  onSetCategoryId: (value: number | null) => void;
  onSetExpenseAccountId: (value: number | null) => void;
  onSetNote: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function ExpenseFormModal({
  visible,
  mode,
  expenseDate,
  showDate,
  amountText,
  amountError,
  categoryId,
  expenseAccountId,
  note,
  visibleCategories,
  accounts,
  historicalAccount,
  saveDisabled,
  saving,
  actions,
  onSetShowDate,
  onSetExpenseDate,
  onSetAmountText,
  onSetCategoryId,
  onSetExpenseAccountId,
  onSetNote,
  onClose,
  onSave,
}: ExpenseFormModalProps) {
  const { colors } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);

  const accountLeadingItems: { label: string; value: number | "none" }[] = [
    { label: "No account", value: "none" },
    ...(historicalAccount
      ? [{ label: `${historicalAccount.name} (Not eligible)`, value: historicalAccount.id }]
      : []),
  ];

  return (
    <ModalCard visible={visible} onRequestClose={onClose} useCard={false}>
      <ModalContentCard>
        <ModalHeaderBar
          title={mode === "edit" ? "Edit Expense" : "Add Expense"}
          actions={actions}
          menuAccessibilityLabel="More expense actions"
        />

        <FormLabel>Date</FormLabel>
        <Pressable onPress={() => onSetShowDate(true)}>
          <FieldShell>
            <Text style={{ color: colors.text }}>{expenseDate.toLocaleDateString("en-PH")}</Text>
          </FieldShell>
        </Pressable>
        {showDate ? (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            onChange={(_event, nextDate) => {
              onSetShowDate(false);
              if (nextDate) onSetExpenseDate(nextDate);
            }}
          />
        ) : null}

        <FormLabel>Amount</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Expense amount"
            value={amountText}
            onChangeText={onSetAmountText}
            placeholder="e.g. 250 or =200+50"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numbers-and-punctuation"
            style={fieldInputStyle}
          />
        </FieldShell>
        {amountError ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>{amountError}</Text>
        ) : (
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
            Tip: You can use +, -, *, and / for quick calculations.
          </Text>
        )}

        <FormLabel>Category</FormLabel>
        <ThemedSelect
          selectedValue={categoryId ?? undefined}
          onValueChange={(value) => onSetCategoryId(value)}
          items={visibleCategories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          accessibilityLabel="Select expense category"
        />

        <FormLabel optional>Account</FormLabel>
        <AccountSelect
          accessibilityLabel="Select linked account"
          accounts={accounts}
          selectedValue={expenseAccountId ?? "none"}
          onValueChange={(value) =>
            onSetExpenseAccountId(value === "none" ? null : (value as number))
          }
          leadingItems={accountLeadingItems}
          labelFn={(a) => `${a.name} (${php.format(a.balance ?? 0)})`}
        />
        {historicalAccount ? (
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
            This linked account is no longer eligible for new links.
          </Text>
        ) : null}

        <FormLabel optional>Notes</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Expense notes"
            value={note}
            onChangeText={onSetNote}
            placeholder="e.g. grocery run, toiletries"
            placeholderTextColor={colors.placeholderText}
            style={fieldInputStyle}
          />
        </FieldShell>

        <ModalFormActions
          onCancel={onClose}
          onSubmit={onSave}
          submitLabel={saving ? "Saving..." : "Save"}
          submitDisabled={saveDisabled}
          cancelDisabled={saving}
          submitLoading={saving}
        />
      </ModalContentCard>
    </ModalCard>
  );
}
