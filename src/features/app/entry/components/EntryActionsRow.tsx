import React from "react";

import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { spacing } from "../../../../styles/tokens";

type EntryActionsRowProps = {
  onCancel: () => void;
  onSubmit: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  cancelAccessibilityLabel?: string;
  submitAccessibilityLabel?: string;
  cancelDisabled?: boolean;
  submitDisabled?: boolean;
  submitLoading?: boolean;
};

export function EntryActionsRow({
  onCancel,
  onSubmit,
  cancelLabel = "Cancel",
  submitLabel = "Save",
  cancelAccessibilityLabel,
  submitAccessibilityLabel,
  cancelDisabled = false,
  submitDisabled = false,
  submitLoading = false,
}: EntryActionsRowProps) {
  return (
    <ModalFormActions
      onCancel={onCancel}
      onSubmit={onSubmit}
      cancelLabel={cancelLabel}
      submitLabel={submitLabel}
      cancelAccessibilityLabel={cancelAccessibilityLabel}
      submitAccessibilityLabel={submitAccessibilityLabel}
      cancelDisabled={cancelDisabled}
      submitDisabled={submitDisabled}
      submitLoading={submitLoading}
      style={{ marginTop: spacing.sm }}
    />
  );
}
