import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { radius } from "../../../styles/tokens";
import type { ThemeColors } from "../../../theme/colors";
import { useTheme } from "../../../theme/ThemeProvider";
import type { AccountEditState } from "../types";
import { useAccountFormModalController } from "../hooks/useAccountFormModalController";

export type AccountFormModalProps = {
  editing: AccountEditState;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    modalContent: {
      gap: 0,
      paddingTop: 16,
      paddingBottom: 16,
    },
    modalInner: {
      maxHeight: "100%",
      width: "100%",
    },
    scrollContent: {
      flexGrow: 1,
    },
    headerBar: {
      alignItems: "center",
      minHeight: 40,
    },
    formBody: {
      marginTop: 8,
      gap: 12,
    },
    section: {
      gap: 6,
    },
    fieldLabel: {
      fontWeight: "700",
      color: colors.text,
    },
    optionalLabelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
    },
    optionalText: {
      color: colors.mutedText,
      fontWeight: "500",
    },
    inputShell: {
      minHeight: 52,
      borderRadius: 14,
      paddingHorizontal: 14,
      justifyContent: "center",
    },
    inputText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    currencyShell: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    currencyPrefix: {
      color: colors.mutedText,
      fontSize: 18,
      fontWeight: "600",
    },
    currencyInput: {
      flex: 1,
      minWidth: 0,
    },
    accountLabelRow: {
      flexDirection: "row",
      gap: 10,
    },
    accountLabelPill: {
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 18,
    },
    accountLabelText: {
      fontWeight: "800",
      fontSize: 14,
    },
    accountHint: {
      color: colors.mutedText,
      lineHeight: 22,
    },
    institutionSuggestions: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      overflow: "hidden",
      marginTop: 4,
    },
    institutionSuggestionRow: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    institutionSuggestionText: {
      color: colors.text,
      flex: 1,
    },
    footerRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 12,
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    textAction: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    cancelText: {
      fontWeight: "700",
      color: colors.text,
    },
  });
}

export function AccountFormModal({ editing, onClose, onSaved }: AccountFormModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fieldInputStyle = getFieldInputStyle(colors);

  const {
    saving,
    name,
    setName,
    institution,
    institutionInputRef,
    onChangeInstitution,
    institutionSuggestions,
    applyInstitutionSuggestion,
    balanceText,
    onChangeBalanceText,
    goalAmountText,
    onChangeGoalAmountText,
    accountCategory,
    setAccountCategory,
    balanceLabel,
    balancePlaceholder,
    heading,
    attemptClose,
    onSave,
  } = useAccountFormModalController({ editing, onClose, onSaved });

  return (
    <ModalCard
      visible={!!editing}
      onRequestClose={attemptClose}
      innerStyle={styles.modalInner}
      useCard={false}
      scrollable={false}
      contentLayout="bounded"
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
        <ModalContentCard style={styles.modalContent}>
          <ModalHeaderBar title={heading} style={styles.headerBar} />

          <View style={styles.formBody}>
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Name</Text>
              <FieldShell style={styles.inputShell}>
                <TextInput
                  accessibilityLabel="Account name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. GCash"
                  placeholderTextColor={colors.placeholderText}
                  style={[fieldInputStyle, styles.inputText]}
                />
              </FieldShell>
            </View>

            <View style={styles.section}>
              <View style={styles.optionalLabelRow}>
                <Text style={styles.fieldLabel}>Institution</Text>
                <Text style={styles.optionalText}>(optional)</Text>
              </View>
              <FieldShell style={styles.inputShell}>
                <TextInput
                  ref={institutionInputRef}
                  accessibilityLabel="Account institution"
                  value={institution}
                  onChangeText={onChangeInstitution}
                  placeholder="e.g. Bank name"
                  placeholderTextColor={colors.placeholderText}
                  style={[fieldInputStyle, styles.inputText]}
                />
              </FieldShell>
              {institutionSuggestions.length > 0 && (
                <View style={styles.institutionSuggestions}>
                  {institutionSuggestions.map((inst, index) => (
                    <Pressable
                      key={inst.domain}
                      onPress={() => applyInstitutionSuggestion(inst.name)}
                      style={[
                        styles.institutionSuggestionRow,
                        {
                          borderTopWidth: index > 0 ? 1 : 0,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.institutionSuggestionText}>{inst.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {editing?.type !== "SAVINGS" && (
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>{balanceLabel}</Text>
                <FieldShell style={[styles.inputShell, styles.currencyShell]}>
                  <TextInput
                    accessibilityLabel={balanceLabel}
                    value={balanceText}
                    onChangeText={onChangeBalanceText}
                    placeholder={balancePlaceholder}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.placeholderText}
                    style={[fieldInputStyle, styles.inputText, styles.currencyInput]}
                  />
                </FieldShell>
              </View>
            )}

            {editing?.type === "SAVINGS" ? (
              <>
                <View style={styles.section}>
                  <View style={styles.optionalLabelRow}>
                    <Text style={styles.fieldLabel}>Goal amount</Text>
                    <Text style={styles.optionalText}>(optional)</Text>
                  </View>
                  <FieldShell style={[styles.inputShell, styles.currencyShell]}>
                    <TextInput
                      accessibilityLabel="Goal amount"
                      value={goalAmountText}
                      onChangeText={onChangeGoalAmountText}
                      placeholder="e.g. 20,000"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.placeholderText}
                      style={[fieldInputStyle, styles.inputText, styles.currencyInput]}
                    />
                  </FieldShell>
                </View>

                <View style={styles.section}>
                  <Text style={styles.fieldLabel}>Account label</Text>
                  <View style={styles.accountLabelRow}>
                    {(["SAVINGS", "INVESTMENT"] as const).map((label) => {
                      const isSelected = accountCategory === label;
                      return (
                        <Pressable
                          key={label}
                          onPress={() => setAccountCategory(label)}
                          style={[
                            styles.accountLabelPill,
                            {
                              backgroundColor: isSelected ? colors.primaryBg : colors.surfaceAlt,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.accountLabelText,
                              {
                                color: isSelected ? colors.primaryText : colors.text,
                              },
                            ]}
                          >
                            {label === "SAVINGS" ? "Savings" : "Investment"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.accountHint}>
                    Investments use the same tracking rules as savings.
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.footerRight}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel account changes"
                onPress={onClose}
                disabled={saving}
                style={styles.textAction}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <PrimaryButton
                accessibilityLabel={saving ? "Saving account" : "Save account"}
                onPress={onSave}
                disabled={saving}
                loading={saving}
              >
                {saving ? "Saving..." : "Save"}
              </PrimaryButton>
            </View>
          </View>
        </ModalContentCard>
      </ScrollView>
    </ModalCard>
  );
}
