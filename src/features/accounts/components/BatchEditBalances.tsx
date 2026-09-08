import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, TextInput, View } from "react-native";

import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { CheckIconButton } from "../../../components/ui/CheckIconButton";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { InfoTooltip } from "../../../components/ui/InfoTooltip";
import { InnerCard } from "../../../components/ui/InnerCard";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { useTheme } from "../../../theme/ThemeProvider";
import { confirmDiscardChanges } from "../../../utils/confirm";
import { parseNumber } from "../../../utils/parseNumber";
import { updateAccountBalance, updateAccountBalances } from "../service";
import type { AccountRow } from "../types";

type BalanceEditRow = {
  id: number;
  name: string;
  balance: number;
  balanceText: string;
};

export type BatchEditBalancesProps = {
  visible: boolean;
  accounts: AccountRow[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export function BatchEditBalances({ visible, accounts, onClose, onSaved }: BatchEditBalancesProps) {
  const { colors, scheme } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);
  const modalInputShellStyle = scheme === "dark" ? { backgroundColor: colors.surface } : undefined;
  const [balanceEdits, setBalanceEdits] = useState<BalanceEditRow[]>([]);
  const [balanceIndex, setBalanceIndex] = useState(0);
  const [balancePageWidth, setBalancePageWidth] = useState(0);
  const [savingBalanceId, setSavingBalanceId] = useState<number | null>(null);
  const [savingAllBalances, setSavingAllBalances] = useState(false);
  const [savedBalanceIds, setSavedBalanceIds] = useState<Record<number, boolean>>({});
  const balanceScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!visible) {
      setBalanceEdits([]);
      setBalanceIndex(0);
      setSavingBalanceId(null);
      setSavingAllBalances(false);
      setSavedBalanceIds({});
      return;
    }
    setBalanceEdits(
      accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        balance: acc.balance ?? 0,
        balanceText: String(acc.balance ?? 0),
      }))
    );
    setBalanceIndex(0);
    setSavedBalanceIds({});
    requestAnimationFrame(() => {
      balanceScrollRef.current?.scrollTo({ x: 0, animated: false });
    });
  }, [accounts, visible]);

  const isDirty = useMemo(
    () => balanceEdits.some((row) => row.balanceText !== String(row.balance)),
    [balanceEdits]
  );

  const attemptClose = () => {
    if (savingAllBalances || savingBalanceId) return;
    if (!isDirty) {
      onClose();
      return;
    }
    confirmDiscardChanges(onClose);
  };

  const updateBalanceText = (id: number, text: string) => {
    setBalanceEdits((prev) =>
      prev.map((row) => (row.id === id ? { ...row, balanceText: text } : row))
    );
    setSavedBalanceIds((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveBalanceAtIndex = async (index: number) => {
    const row = balanceEdits[index];
    if (!row) return;
    const nextBalance = parseNumber(row.balanceText);
    if (!Number.isFinite(nextBalance)) {
      Alert.alert("Enter a valid number for balance");
      return;
    }

    try {
      setSavingBalanceId(row.id);
      await updateAccountBalance(row.id, nextBalance);
      setBalanceEdits((prev) =>
        prev.map((entry) =>
          entry.id === row.id
            ? { ...entry, balance: nextBalance, balanceText: String(nextBalance) }
            : entry
        )
      );
      setSavedBalanceIds((prev) => ({ ...prev, [row.id]: true }));
    } finally {
      setSavingBalanceId(null);
    }
  };

  const saveAllBalances = async () => {
    if (balanceEdits.length === 0) {
      onClose();
      return;
    }
    const updates: { id: number; balance: number }[] = [];
    for (const row of balanceEdits) {
      const nextBalance = parseNumber(row.balanceText);
      if (!Number.isFinite(nextBalance)) {
        Alert.alert(`Enter a valid number for ${row.name}`);
        return;
      }
      updates.push({ id: row.id, balance: nextBalance });
    }

    try {
      setSavingAllBalances(true);
      await updateAccountBalances(updates);
      await onSaved();
      onClose();
    } finally {
      setSavingAllBalances(false);
    }
  };

  const handleBalanceScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (!balancePageWidth) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / balancePageWidth);
    setBalanceIndex(Math.max(0, Math.min(balanceEdits.length - 1, nextIndex)));
  };

  return (
    <ModalCard visible={visible} onRequestClose={attemptClose} useCard={false}>
      <ModalContentCard>
        <ModalHeaderBar
          title="Edit balances"
          titleAccessory={
            <InfoTooltip
              title="Edit balances"
              message="Wallets are connected to Expense Tracker. If the current balance no longer matches your actual balance, adjust it here."
            />
          }
          subtitle={
            balanceEdits.length ? `${balanceIndex + 1} of ${balanceEdits.length}` : undefined
          }
          rightContent={
            savingAllBalances ? (
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.text,
                  opacity: 0.6,
                  padding: 8,
                }}
              >
                Saving...
              </Text>
            ) : (
              <CheckIconButton onPress={saveAllBalances} accessibilityLabel="Save balances" />
            )
          }
        />

        <View
          onLayout={(event) => setBalancePageWidth(event.nativeEvent.layout.width)}
          style={{ minHeight: 140 }}
        >
          <ScrollView
            ref={balanceScrollRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={balancePageWidth || 300}
            snapToAlignment="start"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleBalanceScrollEnd}
          >
            {balanceEdits.map((row, index) => (
              <View
                key={row.id}
                style={{
                  width: balancePageWidth || 300,
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                }}
              >
                <InnerCard
                  style={{
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>{row.name}</Text>
                  <Text style={{ color: colors.mutedText }}>Wallet balance</Text>
                  <FieldShell style={modalInputShellStyle}>
                    <TextInput
                      accessibilityLabel={`New balance for ${row.name}`}
                      keyboardType="decimal-pad"
                      value={row.balanceText}
                      onChangeText={(text) => updateBalanceText(row.id, text)}
                      placeholder="e.g. 10000"
                      placeholderTextColor={colors.placeholderText}
                      style={fieldInputStyle}
                    />
                  </FieldShell>
                  <PrimaryButton
                    accessibilityLabel={`Save balance for ${row.name}`}
                    onPress={() => saveBalanceAtIndex(index)}
                    disabled={savingBalanceId === row.id || !!savedBalanceIds[row.id]}
                    loading={savingBalanceId === row.id}
                  >
                    {savingBalanceId === row.id
                      ? "Saving..."
                      : savedBalanceIds[row.id]
                        ? "Saved"
                        : "Save"}
                  </PrimaryButton>
                </InnerCard>
              </View>
            ))}
          </ScrollView>
        </View>

        <Text style={{ color: colors.mutedText, textAlign: "center" }}>
          Swipe left or right to switch accounts
        </Text>
      </ModalContentCard>
    </ModalCard>
  );
}
