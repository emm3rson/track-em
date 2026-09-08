import type { ActionBottomSheetAction } from "../../../components/ui/ActionBottomSheet";

import type { LedgerEntryActionTarget } from "./types";
import { Pencil, Trash } from "lucide-react-native";

export function isExpenseLinked(entry: LedgerEntryActionTarget): boolean {
  return entry.linkedExpenseId != null;
}

export function isObligationLinked(entry: LedgerEntryActionTarget): boolean {
  return entry.linkedReceivablePaymentId != null || entry.linkedPayablePaymentId != null;
}

export function isLentMoneyLinked(entry: LedgerEntryActionTarget): boolean {
  return entry.sourceKind === "LENT_MONEY_ACCOUNT_ENTRY";
}

export function isEditableLedgerEntry(entry: LedgerEntryActionTarget): boolean {
  return (
    entry.transferGroupId == null &&
    !isExpenseLinked(entry) &&
    !isObligationLinked(entry) &&
    !isLentMoneyLinked(entry)
  );
}

export function buildDefaultLedgerSheetActions<TEntry extends LedgerEntryActionTarget>(params: {
  entry: TEntry | null;
  isArchiving: boolean;
  onEdit: (entry: TEntry) => void;
  onArchive: (entry: TEntry) => void;
}): ActionBottomSheetAction[] {
  const { entry, isArchiving, onEdit, onArchive } = params;
  const noTarget = !entry;

  if (entry && isExpenseLinked(entry)) {
    return [
      {
        key: "edit-linked-expense",
        label: "Edit",
        Icon: Pencil,
        disabled: noTarget || isArchiving,
        onPress: () => {
          if (!entry || isArchiving) return;
          onEdit(entry);
        },
      },
    ];
  }

  if (entry && isObligationLinked(entry)) {
    return [
      {
        key: "edit-linked-obligation",
        label: "Edit",
        Icon: Pencil,
        disabled: noTarget || isArchiving,
        onPress: () => {
          if (!entry || isArchiving) return;
          onEdit(entry);
        },
      },
    ];
  }

  if (entry && isLentMoneyLinked(entry)) {
    return [
      {
        key: "edit-linked-receivable",
        label: "Edit",
        Icon: Pencil,
        disabled: noTarget || isArchiving,
        onPress: () => {
          if (!entry || isArchiving) return;
          onEdit(entry);
        },
      },
    ];
  }

  if (entry && entry.transferGroupId != null) {
    return [
      {
        key: "delete-transfer",
        label: isArchiving ? "Deleting..." : "Delete Transfer",
        tone: "danger" as const,
        Icon: Trash,
        disabled: noTarget || isArchiving,
        onPress: () => {
          if (!entry || isArchiving) return;
          onArchive(entry);
        },
      },
    ];
  }

  if (entry && !isEditableLedgerEntry(entry)) {
    return [];
  }

  return [
    {
      key: "edit",
      label: "Edit",
      Icon: Pencil,
      disabled: noTarget || isArchiving,
      onPress: () => {
        if (!entry || isArchiving) return;
        onEdit(entry);
      },
    },
    {
      key: "archive",
      label: isArchiving ? "Archiving..." : "Archive",
      tone: "danger" as const,
      Icon: Trash,
      disabled: noTarget || isArchiving,
      onPress: () => {
        if (!entry || isArchiving) return;
        onArchive(entry);
      },
    },
  ];
}
