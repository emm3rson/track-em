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
import { isoDate } from "../../../utils/dates";
import { php } from "../../../utils/currency";
import { reconcileSavingsBalance } from "../service";
import type { AccountRow } from "../types";

type ReconcileEditRow = {
  id: number;
  name: string;
  balance: number;
  actualText: string;
};

export type BatchReconcileProps = {
  visible: boolean;
  accounts: AccountRow[];
  onClose: () => void;
  onReconciled: () => Promise<void> | void;
};

export function BatchReconcile({ visible, accounts, onClose, onReconciled }: BatchReconcileProps) {
  const { colors, scheme } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);
  const modalInputShellStyle = scheme === "dark" ? { backgroundColor: colors.surface } : undefined;
  const [reconcileEdits, setReconcileEdits] = useState<ReconcileEditRow[]>([]);
  const [reconcileIndex, setReconcileIndex] = useState(0);
  const [reconcilePageWidth, setReconcilePageWidth] = useState(0);
  const [savingReconcileId, setSavingReconcileId] = useState<number | null>(null);
  const reconcileScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!visible) {
      setReconcileEdits([]);
      setReconcileIndex(0);
      setSavingReconcileId(null);
      return;
    }

    setReconcileEdits(
      accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        balance: acc.balance ?? 0,
        actualText: "",
      }))
    );
    setReconcileIndex(0);
    requestAnimationFrame(() => {
      reconcileScrollRef.current?.scrollTo({ x: 0, animated: false });
    });
  }, [accounts, visible]);

  const isDirty = useMemo(
    () => reconcileEdits.some((row) => row.actualText.trim() !== ""),
    [reconcileEdits]
  );

  const attemptClose = () => {
    if (savingReconcileId) return;
    if (!isDirty) {
      onClose();
      return;
    }
    confirmDiscardChanges(onClose);
  };

  const updateReconcileText = (id: number, text: string) => {
    setReconcileEdits((prev) =>
      prev.map((row) => (row.id === id ? { ...row, actualText: text } : row))
    );
  };

  const saveReconcileAtIndex = async (index: number) => {
    const row = reconcileEdits[index];
    if (!row) return;
    const actualRaw = row.actualText.trim();
    const actual = actualRaw ? parseNumber(actualRaw) : Number.NaN;
    if (!Number.isFinite(actual)) {
      Alert.alert("Enter a valid actual balance");
      return;
    }

    try {
      setSavingReconcileId(row.id);
      const result = await reconcileSavingsBalance({
        accountId: row.id,
        actualBalance: actual,
        dateIso: isoDate(new Date()),
      });
      if (result.status === "missing") {
        Alert.alert("Savings account not found");
        return;
      }
      if (result.status === "matched") {
        Alert.alert("Balance already matches", "No adjustment is needed.");
        return;
      }
      await onReconciled();
      setReconcileEdits((prev) =>
        prev.map((entry) =>
          entry.id === row.id ? { ...entry, balance: actual, actualText: "" } : entry
        )
      );
      Alert.alert("Reconciled", `Added ${php.format(result.offset)} to cashflow.`);
    } finally {
      setSavingReconcileId(null);
    }
  };

  const handleReconcileScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (!reconcilePageWidth) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / reconcilePageWidth);
    setReconcileIndex(Math.max(0, Math.min(reconcileEdits.length - 1, nextIndex)));
  };

  return (
    <ModalCard visible={visible} onRequestClose={attemptClose} variant="absolute" useCard={false}>
      <ModalContentCard>
        <ModalHeaderBar
          title="Reconcile balances"
          titleAccessory={
            <InfoTooltip
              title="Reconcile balances"
              message="Enter the actual balance from your bank app. An adjustment cashflow entry will be added for the difference (actual - calculated)."
            />
          }
          subtitle={
            reconcileEdits.length ? `${reconcileIndex + 1} of ${reconcileEdits.length}` : undefined
          }
          rightContent={
            <CheckIconButton
              onPress={attemptClose}
              disabled={!!savingReconcileId}
              accessibilityLabel="Done reconciling"
            />
          }
        />

        <View
          onLayout={(event) => setReconcilePageWidth(event.nativeEvent.layout.width)}
          style={{ minHeight: 220 }}
        >
          <ScrollView
            ref={reconcileScrollRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={reconcilePageWidth || 300}
            snapToAlignment="start"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleReconcileScrollEnd}
          >
            {reconcileEdits.map((row, index) => {
              const actualRaw = row.actualText.trim();
              const actual = actualRaw ? parseNumber(actualRaw) : Number.NaN;
              const actualValid = Number.isFinite(actual);
              const offsetRaw = actualValid ? actual - row.balance : null;
              const offset = offsetRaw != null ? Math.round(offsetRaw * 100) / 100 : null;
              const isZero = offset != null && Math.abs(offset) < 0.005;
              const canSave = actualValid && !isZero;

              return (
                <View
                  key={row.id}
                  style={{
                    width: reconcilePageWidth || 300,
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
                    <View>
                      <Text style={{ color: colors.mutedText }}>Calculated balance</Text>
                      <Text style={{ fontWeight: "700" }}>{php.format(row.balance)}</Text>
                    </View>

                    <Text style={{ fontWeight: "700" }}>Actual current balance</Text>
                    <FieldShell style={modalInputShellStyle}>
                      <TextInput
                        accessibilityLabel={`Actual balance for ${row.name}`}
                        value={row.actualText}
                        onChangeText={(text) => updateReconcileText(row.id, text)}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 10500"
                        placeholderTextColor={colors.placeholderText}
                        style={fieldInputStyle}
                      />
                    </FieldShell>

                    <View
                      style={{
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontWeight: "700" }}>Adjustment to add</Text>
                      <Text>{php.format(actualValid ? (offset ?? 0) : 0)}</Text>
                      {actualValid && isZero ? (
                        <Text style={{ color: colors.mutedText }}>Balance already matches.</Text>
                      ) : null}
                    </View>

                    <PrimaryButton
                      accessibilityLabel={`Add reconciliation adjustment for ${row.name}`}
                      onPress={() => saveReconcileAtIndex(index)}
                      disabled={savingReconcileId === row.id || !canSave}
                      loading={savingReconcileId === row.id}
                    >
                      {savingReconcileId === row.id ? "Saving..." : "Add Adjustment"}
                    </PrimaryButton>
                  </InnerCard>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <Text style={{ color: colors.mutedText, textAlign: "center" }}>
          Swipe left or right to switch accounts
        </Text>
      </ModalContentCard>
    </ModalCard>
  );
}
