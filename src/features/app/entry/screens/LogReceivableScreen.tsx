import React from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";

import { EntryAmountField } from "../components/EntryAmountField";
import { EntryDateField } from "../components/EntryDateField"; // kept for target payment date
import { EntryModalLayout } from "../components/EntryModalLayout";
import { EntryTextField } from "../components/EntryTextField";
import { EntryAccountSelect } from "../components/EntryAccountSelect";
import { useLogReceivableScreenController } from "../hooks/useLogReceivableScreenController";
import type { RootStackParamList } from "../../../../navigation/types";

export function LogReceivableScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryLogReceivable">>();
  const scopedAccount = route.params?.scopedAccount;
  const {
    person,
    setPerson,
    personError,
    amountText,
    setAmountText,
    amountError,
    note,
    setNote,
    targetPaymentDate,
    setTargetPaymentDate,
    accounts,
    preferredAccountId,
    setPreferredAccountId,
    saving,
    saveDisabled,
    cancel,
    submit,
  } = useLogReceivableScreenController();

  return (
    <EntryModalLayout title="Log Receivable" subtitle={scopedAccount?.accountName}>
      <EntryTextField
        label="Person"
        value={person}
        onChangeText={setPerson}
        accessibilityLabel="Receivable person"
        placeholder="e.g. Juan Dela Cruz"
        autoCapitalize="words"
      />
      {!person.trim() ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{personError}</Text>
      ) : null}

      <EntryAmountField
        value={amountText}
        onChangeText={setAmountText}
        accessibilityLabel="Receivable amount"
        placeholder="e.g. 1500"
        error={amountText.trim() ? amountError : null}
      />

      <EntryTextField
        label="Note"
        optional
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Receivable note"
        placeholder="e.g. group dinner split"
      />

      <EntryDateField
        label="Target payment date"
        optional
        value={targetPaymentDate}
        onChange={setTargetPaymentDate}
        accessibilityLabel="Target payment date"
        clearable
        clearAccessibilityLabel="Clear target payment date"
        placeholder="Not set"
      />

      <EntryAccountSelect
        label="Preferred repayment account"
        optional
        accounts={accounts}
        leadingItems={[{ label: "No account", value: "none" as number | "none" }]}
        selectedValue={preferredAccountId ?? "none"}
        onValueChange={(v) => setPreferredAccountId(v === "none" ? null : (v as number))}
        accessibilityLabel="Preferred repayment account"
      />

      <ModalFormActions
        onCancel={cancel}
        onSubmit={() => void submit()}
        submitLabel={saving ? "Saving..." : "Save Receivable"}
        submitAccessibilityLabel="Save receivable"
        cancelAccessibilityLabel="Cancel receivable entry"
        submitDisabled={saveDisabled}
        cancelDisabled={saving}
        submitLoading={saving}
      />
    </EntryModalLayout>
  );
}
