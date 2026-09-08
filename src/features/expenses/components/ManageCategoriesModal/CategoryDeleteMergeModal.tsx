import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ModalCard } from "../../../../components/ModalCard";
import { Card, Text } from "../../../../components/Themed";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { ThemedSelect } from "../../../../components/ui/ThemedSelect";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing, typography } from "../../../../styles/tokens";
import type { ExpenseCategory } from "../../types";

type Props = {
  target: ExpenseCategory | null;
  usageCount: number;
  mergeTargetId: number | undefined;
  onMergeTargetChange: (value: number) => void;
  options: { label: string; value: number }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function CategoryDeleteMergeModal({
  target,
  usageCount,
  mergeTargetId,
  onMergeTargetChange,
  options,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const { colors } = useTheme();

  return (
    <ModalCard visible={!!target} onRequestClose={onClose} useCard={false}>
      <Card variant="modal" style={styles.secondaryModalCard}>
        <Text style={{ fontSize: typography.sectionTitle, fontWeight: "700", color: colors.text }}>
          Delete Category
        </Text>
        <Text style={{ color: colors.mutedText }}>
          {target?.name} has {usageCount} {usageCount === 1 ? "expense entry" : "expense entries"}.
        </Text>
        <Text style={{ color: colors.mutedText }}>
          Choose where these entries should be moved before deleting this category.
        </Text>

        <Text style={{ fontWeight: "700", color: colors.text }}>Move existing entries to</Text>
        <ThemedSelect
          selectedValue={mergeTargetId}
          onValueChange={(value) => onMergeTargetChange(value)}
          items={options}
          accessibilityLabel="Select destination category"
        />

        <View style={styles.modalActionsRow}>
          <Pressable onPress={onClose} disabled={saving} style={styles.textAction}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Cancel</Text>
          </Pressable>
          <PrimaryButton
            onPress={onSubmit}
            disabled={saving || mergeTargetId == null}
            loading={saving}
          >
            {saving ? "Deleting..." : "Delete"}
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
