import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ArchiveModalShell } from "../../../components/ui/ArchiveModalShell";
import { Text } from "../../../components/Themed";
import { InnerCard } from "../../../components/ui/InnerCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import {
  ActionBottomSheet,
  type ActionBottomSheetAction,
} from "../../../components/ui/ActionBottomSheet";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import { formatMonthLabel } from "../../../utils/dates";
import { RotateCcw, Trash } from "lucide-react-native";
import { useMemo, useState } from "react";

type ArchivedMonthsModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  archivedMonths: string[];
  statusTotalsByMonth: Map<string, { paid: number; remaining: number }>;
  autoArchivedSet: Set<string>;
  restoringMonth: string | null;
  onRestoreMonth: (month: string) => void;
  onDeleteMonth: (month: string) => void;
};

export function ArchivedMonthsModal({
  visible,
  onRequestClose,
  archivedMonths,
  statusTotalsByMonth,
  autoArchivedSet,
  restoringMonth,
  onRestoreMonth,
  onDeleteMonth,
}: ArchivedMonthsModalProps) {
  const { colors } = useTheme();
  const [actionTarget, setActionTarget] = useState<string | null>(null);

  const actions = useMemo<ActionBottomSheetAction[]>(() => {
    if (!actionTarget) return [];

    const isAutoArchived = autoArchivedSet.has(actionTarget);
    const totals = statusTotalsByMonth.get(actionTarget) ?? { paid: 0, remaining: 0 };
    const canDelete = totals.paid === 0;

    const sheetActions: ActionBottomSheetAction[] = [
      {
        key: "restore",
        label: "Restore",
        Icon: RotateCcw,
        disabled: isAutoArchived,
        onPress: () => {
          const target = actionTarget;
          setActionTarget(null);
          onRestoreMonth(target);
        },
      },
    ];

    if (canDelete) {
      sheetActions.push({
        key: "delete",
        label: "Delete",
        Icon: Trash,
        tone: "danger",
        onPress: () => {
          const target = actionTarget;
          setActionTarget(null);
          onDeleteMonth(target);
        },
      });
    }

    return sheetActions;
  }, [actionTarget, autoArchivedSet, statusTotalsByMonth, onRestoreMonth, onDeleteMonth]);

  return (
    <>
      <ArchiveModalShell
        visible={visible}
        onRequestClose={onRequestClose}
        title="Archived Months"
        accessibilityLabelClose="Close archived months"
      >
        {archivedMonths.length === 0 ? (
          <Text style={{ color: colors.mutedText }}>No archived months.</Text>
        ) : (
          <FlatList
            data={archivedMonths}
            keyExtractor={(month) => month}
            renderItem={({ item: month }) => {
              const totals = statusTotalsByMonth.get(month) ?? { paid: 0, remaining: 0 };
              const total = totals.paid + totals.remaining;
              const isAutoArchived = autoArchivedSet.has(month);

              const statusLabel =
                total > 0 && totals.paid >= total
                  ? "Paid"
                  : totals.paid > 0
                    ? "Partially Paid"
                    : "Unpaid";

              const toneValue =
                statusLabel === "Paid"
                  ? "settled"
                  : statusLabel === "Partially Paid"
                    ? "partial"
                    : "muted";

              return (
                <Pressable onPress={() => setActionTarget(month)}>
                  <InnerCard
                    style={{
                      padding: 12,
                      gap: 6,
                    }}
                  >
                    <View style={styles.row}>
                      <View>
                        <Text style={{ fontWeight: "700" }}>{formatMonthLabel(month)}</Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                          Total: {php.format(total)}
                        </Text>
                        {isAutoArchived ? (
                          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            Auto-archived
                          </Text>
                        ) : null}
                      </View>
                      <StatusBadge label={statusLabel} tone={toneValue} />
                    </View>
                  </InnerCard>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ArchiveModalShell>
      <ActionBottomSheet
        visible={!!actionTarget}
        title={actionTarget ? `Actions for ${formatMonthLabel(actionTarget)}` : "Actions"}
        actions={actions}
        onClose={() => setActionTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    width: "100%",
    maxHeight: "100%",
    minHeight: 0,
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  separator: {
    height: 10,
  },
});
