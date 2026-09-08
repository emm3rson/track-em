import React, { useMemo } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ModalCard } from "../../../../components/ModalCard";
import { ModalContentCard } from "../../../../components/ModalContentCard";
import { Text } from "../../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../../components/ui/ModalHeaderBar";
import { radius, spacing } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { evaluateAmountExpression } from "../../../../utils/amountExpression";

type MiniAmountCalculatorModalProps = {
  visible: boolean;
  expression: string;
  onChangeExpression: (value: string) => void;
  onClose: () => void;
  onApply: (value: number) => void;
};

const BUTTON_ROWS = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "DEL", "+"],
  ["C", "="],
] as const;

export function MiniAmountCalculatorModal({
  visible,
  expression,
  onChangeExpression,
  onClose,
  onApply,
}: MiniAmountCalculatorModalProps) {
  const { colors } = useTheme();
  const inputStyle = getFieldInputStyle(colors);

  const evaluation = useMemo(() => {
    const trimmed = expression.trim();
    if (!trimmed) return null;
    return evaluateAmountExpression(`=${trimmed}`);
  }, [expression]);

  const resolvedResult = evaluation && evaluation.ok ? evaluation.value : null;
  const resultError = evaluation && !evaluation.ok ? evaluation.error : null;
  const canApply = resolvedResult != null && Number.isFinite(resolvedResult) && resolvedResult > 0;

  const handleTapKey = (value: string) => {
    if (value === "C") {
      onChangeExpression("");
      return;
    }
    if (value === "DEL") {
      onChangeExpression(expression.slice(0, -1));
      return;
    }
    if (value === "=") {
      if (!canApply || resolvedResult == null) return;
      onChangeExpression(normalizeNumberString(resolvedResult));
      return;
    }
    onChangeExpression(`${expression}${value}`);
  };

  return (
    <ModalCard visible={visible} onRequestClose={onClose} useCard={false}>
      <ModalContentCard style={styles.content}>
        <ModalHeaderBar title="Calculator" subtitle="Build amount with operators" />

        <View style={styles.group}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Expression</Text>
          <FieldShell>
            <TextInput
              value={expression}
              onChangeText={onChangeExpression}
              placeholder="e.g. 200+50"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numbers-and-punctuation"
              autoFocus
              accessibilityLabel="Amount expression"
              style={inputStyle}
            />
          </FieldShell>
        </View>

        <View style={styles.resultContainer}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Result</Text>
          {resultError ? (
            <Text style={[styles.resultText, { color: colors.danger }]}>{resultError}</Text>
          ) : (
            <Text style={[styles.resultText, { color: colors.text }]}>
              {resolvedResult == null ? "-" : normalizeNumberString(resolvedResult)}
            </Text>
          )}
        </View>

        <View style={styles.keypad}>
          {BUTTON_ROWS.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.keyRow}>
              {row.map((keyValue) => {
                const wide = row.length === 2;
                const isAction = keyValue === "C" || keyValue === "DEL" || keyValue === "=";
                return (
                  <Pressable
                    key={keyValue}
                    accessibilityRole="button"
                    accessibilityLabel={`Calculator key ${keyValue}`}
                    onPress={() => handleTapKey(keyValue)}
                    style={[
                      styles.keyButton,
                      {
                        backgroundColor: isAction ? colors.surfaceMuted : colors.surfaceRaised,
                        borderColor: colors.border,
                      },
                      wide ? styles.keyButtonWide : null,
                    ]}
                  >
                    <Text style={[styles.keyText, { color: colors.text }]}>{keyValue}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <ModalFormActions
          onCancel={onClose}
          onSubmit={() => {
            if (resolvedResult == null || !canApply) return;
            onApply(resolvedResult);
          }}
          submitLabel="Apply"
          submitAccessibilityLabel="Apply calculator result"
          cancelAccessibilityLabel="Close calculator"
          submitDisabled={!canApply}
        />
      </ModalContentCard>
    </ModalCard>
  );
}

function normalizeNumberString(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  resultContainer: {
    gap: spacing.xs,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "700",
  },
  keypad: {
    gap: spacing.xs,
  },
  keyRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  keyButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  keyButtonWide: {
    flex: 1,
  },
  keyText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
