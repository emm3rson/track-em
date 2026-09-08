import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { ArchiveModalShell } from "../../../../components/ui/ArchiveModalShell";
import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";
import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import { spacing, typography } from "../../../../styles/tokens";

import { useManageCategoriesController } from "./useManageCategoriesController";
import { CategoryListRow, CategoryListSeparator } from "./CategoryListRow";
import { CategoryFormModal } from "./CategoryFormModal";
import { CategoryDeleteMergeModal } from "./CategoryDeleteMergeModal";
import type { ExpenseCategory } from "../../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void | Promise<void>;
};

export function ManageCategoriesModal({ visible, onClose, onCategoriesChanged }: Props) {
  const controller = useManageCategoriesController({ visible, onClose, onCategoriesChanged });
  const { colors } = useTheme();
  useGlobalSwipeLock(controller.form.visible || !!controller.deleteMerge.target);

  return (
    <>
      <ArchiveModalShell
        title="Manage Categories"
        visible={visible}
        onRequestClose={controller.closeMainModal}
        accessibilityLabelClose="Close categories"
        bodyMinHeight={500}
      >
        <View style={styles.bodyWrapper}>
          <FlatList
            data={controller.list.categories}
            keyExtractor={(c: ExpenseCategory) => String(c.id)}
            renderItem={({ item }) => (
              <CategoryListRow
                category={item}
                isProtected={controller.list.isProtected(item.name)}
                onPress={controller.rowActions.setActionTarget}
              />
            )}
            ItemSeparatorComponent={CategoryListSeparator}
            ListEmptyComponent={
              <Text style={[styles.emptyListText, { color: colors.mutedText }]}>
                No categories yet.{"\n"}Add one to start organizing your expenses.
              </Text>
            }
            style={styles.categoryList}
            contentContainerStyle={styles.categoryListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.mainFooter, { borderTopColor: colors.border }]}>
            <PrimaryButton
              onPress={controller.form.openAdd}
              accessibilityLabel="Add category"
              textStyle={{ fontWeight: "700", fontSize: typography.body }}
            >
              Add Category
            </PrimaryButton>
          </View>
        </View>
      </ArchiveModalShell>

      <ActionBottomSheet
        visible={!!controller.rowActions.actionTarget}
        title={controller.rowActions.actionTarget?.name ?? "Actions"}
        actions={controller.rowActions.actionMenuItems}
        onClose={() => controller.rowActions.setActionTarget(null)}
      />

      <CategoryFormModal
        visible={controller.form.visible}
        title={controller.form.title}
        nameInput={controller.form.nameInput}
        onNameChange={controller.form.setNameInput}
        saving={controller.form.saving}
        onCancel={controller.form.attemptClose}
        onSave={controller.form.save}
      />

      <CategoryDeleteMergeModal
        target={controller.deleteMerge.target}
        usageCount={controller.deleteMerge.usageCount}
        mergeTargetId={controller.deleteMerge.mergeTargetId}
        onMergeTargetChange={controller.deleteMerge.setMergeTargetId}
        options={controller.deleteMerge.options}
        saving={controller.deleteMerge.saving}
        onClose={controller.deleteMerge.close}
        onSubmit={controller.deleteMerge.submit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bodyWrapper: {
    flex: 1,
  },
  categoryList: {
    flex: 1,
  },
  categoryListContent: {
    paddingBottom: spacing.md,
  },
  mainFooter: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyListText: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
});
