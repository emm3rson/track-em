import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import {
  createCategory,
  deleteCategory,
  deleteCategoryWithReassign,
  getCategoryUsageCount,
  loadCategories,
  renameCategory,
} from "../../service";
import type { ExpenseCategory } from "../../types";
import { confirmDiscardChanges } from "../../../../utils/confirm";
import { logger } from "../../../../utils/logger";
import { Pencil, Trash } from "lucide-react-native";
import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";

type Params = {
  visible: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void | Promise<void>;
};

export function useManageCategoriesController({ visible, onClose, onCategoriesChanged }: Params) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Form (Add/Rename) state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const editInitialRef = useRef<{ name: string } | null>(null);

  // Row actions state
  const [actionTarget, setActionTarget] = useState<ExpenseCategory | null>(null);

  // Delete-merge state
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState(0);
  const [mergeTargetId, setMergeTargetId] = useState<number | undefined>(undefined);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [hasCategoryChanges, setHasCategoryChanges] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await loadCategories();
      setCategories(Array.isArray(rows) ? rows : []);
    } catch (error) {
      logger.error("expenseCategories", "Load categories failed", error);
      Alert.alert("Failed to load categories", "Please try again.");
    }
  }, []);

  const normalizeName = useCallback((value: string) => value.trim().toLowerCase(), []);
  const isProtected = useCallback(
    (name: string) => ["other", "others"].includes(normalizeName(name)),
    [normalizeName]
  );

  const resetDeleteState = useCallback(() => {
    setDeleteTarget(null);
    setDeleteUsageCount(0);
    setMergeTargetId(undefined);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleteSaving) return;
    resetDeleteState();
  }, [deleteSaving, resetDeleteState]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!visible) return;
    setHasCategoryChanges(false);
    setActionTarget(null);
    resetDeleteState();
    void load();
  }, [load, resetDeleteState, visible]);

  const closeMainModal = useCallback(() => {
    if (deleteSaving) return;
    onClose();
    setActionTarget(null);
    resetDeleteState();
    setHasCategoryChanges(false);
    if (hasCategoryChanges && onCategoriesChanged) {
      void Promise.resolve(onCategoriesChanged()).catch((error) => {
        logger.error("expenseCategories", "Refresh categories after close failed", error);
      });
    }
  }, [resetDeleteState, deleteSaving, hasCategoryChanges, onCategoriesChanged, onClose]);

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const mergeDestinationOptions = useMemo(() => {
    if (!deleteTarget) return [];
    return sortedCategories
      .filter((c) => c.id !== deleteTarget.id)
      .map((c) => ({ label: c.name, value: c.id }));
  }, [deleteTarget, sortedCategories]);

  // --- Form methods ---

  const openAddModal = useCallback(() => {
    setEditTarget(null);
    setNameInput("");
    editInitialRef.current = { name: "" };
    setShowFormModal(true);
  }, []);

  const beginRename = useCallback((category: ExpenseCategory) => {
    setActionTarget(null);
    setEditTarget(category);
    setNameInput(category.name);
    editInitialRef.current = { name: category.name };
    setShowFormModal(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setShowFormModal(false);
    setNameInput("");
    setSaving(false);
    setEditTarget(null);
    editInitialRef.current = null;
  }, []);

  const isDirty = !!editInitialRef.current && nameInput !== editInitialRef.current.name;

  const attemptCloseFormModal = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      closeFormModal();
      return;
    }
    confirmDiscardChanges(closeFormModal);
  }, [saving, isDirty, closeFormModal]);

  const nameExists = useCallback(
    (name: string, ignoreId?: number | null) => {
      const normalized = normalizeName(name);
      return categories.some(
        (c) => normalizeName(c.name) === normalized && (ignoreId == null || c.id !== ignoreId)
      );
    },
    [categories, normalizeName]
  );

  const saveCategory = useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Category name is required");
      return;
    }
    if (editTarget && normalizeName(editTarget.name) === normalizeName(trimmed)) {
      closeFormModal();
      return;
    }
    if (nameExists(trimmed, editTarget?.id)) {
      Alert.alert("Duplicate category", "That category already exists.");
      return;
    }
    try {
      setSaving(true);
      if (editTarget) {
        await renameCategory(editTarget.id, trimmed);
      } else {
        await createCategory(trimmed);
      }
      setHasCategoryChanges(true);
      closeFormModal();
      await load();
    } catch (error) {
      logger.error("expenseCategories", "Save category failed", error);
      Alert.alert("Unable to save category", "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [nameInput, editTarget, normalizeName, nameExists, closeFormModal, load]);

  // --- Delete methods ---

  const deleteUnusedCategory = useCallback(
    async (category: ExpenseCategory) => {
      try {
        setDeleteSaving(true);
        await deleteCategory(category.id);
        setHasCategoryChanges(true);
        await load();
      } catch (error) {
        logger.error("expenseCategories", "Delete unused category failed", error);
        Alert.alert("Delete failed", "Please try again.");
      } finally {
        setDeleteSaving(false);
      }
    },
    [load]
  );

  const beginDeleteFlow = useCallback(
    async (category: ExpenseCategory) => {
      if (isProtected(category.name)) {
        Alert.alert("Protected category", "Others can't be deleted.");
        return;
      }
      try {
        const usageCount = await getCategoryUsageCount(category.id);
        if (usageCount <= 0) {
          Alert.alert("Delete category?", "This category has no expenses and will be deleted.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void deleteUnusedCategory(category);
              },
            },
          ]);
          return;
        }

        const defaultDestination =
          sortedCategories.find((item) => item.id !== category.id && isProtected(item.name)) ??
          sortedCategories.find((item) => item.id !== category.id) ??
          null;
        if (!defaultDestination) {
          Alert.alert("Delete failed", "No destination category is available.");
          return;
        }

        setDeleteTarget(category);
        setDeleteUsageCount(usageCount);
        setMergeTargetId(defaultDestination.id);
      } catch (error) {
        logger.error("expenseCategories", "Prepare delete category failed", error);
        Alert.alert("Delete failed", "Please try again.");
      }
    },
    [deleteUnusedCategory, isProtected, sortedCategories]
  );

  const submitDeleteWithMerge = useCallback(async () => {
    if (!deleteTarget) return;
    if (mergeTargetId == null) {
      Alert.alert("Select a category", "Choose where existing entries should be moved.");
      return;
    }
    try {
      setDeleteSaving(true);
      await deleteCategoryWithReassign(deleteTarget.id, mergeTargetId);
      setHasCategoryChanges(true);
      resetDeleteState();
      await load();
    } catch (error) {
      logger.error("expenseCategories", "Delete category with merge failed", error);
      Alert.alert("Delete failed", "Please try again.");
    } finally {
      setDeleteSaving(false);
    }
  }, [deleteTarget, mergeTargetId, resetDeleteState, load]);

  const actionMenuItems = useMemo<ActionBottomSheetAction[]>(() => {
    return [
      {
        key: "rename",
        label: "Rename",
        Icon: Pencil,
        onPress: () => {
          if (!actionTarget) return;
          beginRename(actionTarget);
        },
      },
      {
        key: "delete",
        label: "Delete",
        tone: "danger",
        Icon: Trash,
        onPress: () => {
          if (!actionTarget) return;
          const target = actionTarget;
          setActionTarget(null);
          void beginDeleteFlow(target);
        },
      },
    ];
  }, [actionTarget, beginRename, beginDeleteFlow]);

  const formModalTitle = editTarget ? "Rename Category" : "Add Category";

  return {
    list: { categories: sortedCategories, isProtected },
    rowActions: { actionTarget, setActionTarget, actionMenuItems },
    form: {
      visible: showFormModal,
      title: formModalTitle,
      nameInput,
      setNameInput,
      saving,
      attemptClose: attemptCloseFormModal,
      save: saveCategory,
      openAdd: openAddModal,
    },
    deleteMerge: {
      target: deleteTarget,
      usageCount: deleteUsageCount,
      mergeTargetId,
      setMergeTargetId,
      options: mergeDestinationOptions,
      saving: deleteSaving,
      close: closeDeleteModal,
      submit: submitDeleteWithMerge,
    },
    closeMainModal,
  };
}
