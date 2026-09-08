import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ModalCard } from "../../../../components/ModalCard";
import { Card, Text } from "../../../../components/Themed";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing, typography } from "../../../../styles/tokens";

type Props = {
  visible: boolean;
  title: string;
  nameInput: string;
  onNameChange: (value: string) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function CategoryFormModal({
  visible,
  title,
  nameInput,
  onNameChange,
  saving,
  onCancel,
  onSave,
}: Props) {
  const { colors } = useTheme();

  return (
    <ModalCard visible={visible} onRequestClose={onCancel} useCard={false}>
      <Card variant="modal" style={styles.secondaryModalCard}>
        <Text style={{ fontSize: typography.sectionTitle, fontWeight: "700", color: colors.text }}>
          {title}
        </Text>
        <Text style={{ fontWeight: "700", color: colors.text }}>Name</Text>
        <FieldShell>
          <TextInput
            value={nameInput}
            onChangeText={onNameChange}
            placeholder="e.g. Household"
            placeholderTextColor={colors.placeholderText}
            style={getFieldInputStyle(colors)}
            autoFocus
          />
        </FieldShell>
        <View style={styles.modalActionsRow}>
          <Pressable onPress={onCancel} disabled={saving} style={styles.textAction}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Cancel</Text>
          </Pressable>
          <PrimaryButton onPress={onSave} disabled={saving} loading={saving}>
            {saving ? "Saving..." : "Save"}
          </PrimaryButton>
        </View>
      </Card>
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  secondaryModalCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  textAction: {
    padding: 12,
  },
});
