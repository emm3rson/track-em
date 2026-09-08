import React, { useState, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ArchiveModalShell } from "../../../components/ui/ArchiveModalShell";
import { Text } from "../../../components/Themed";
import { InnerCard } from "../../../components/ui/InnerCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import type { ReceivableRow } from "../types";
import {
  ActionBottomSheet,
  type ActionBottomSheetAction,
} from "../../../components/ui/ActionBottomSheet";
import { RotateCcw, Trash } from "lucide-react-native";

type ArchivedReceivablesModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  rows: ReceivableRow[];
  loadingInitial: boolean;
  onRestoreReceivable: (entry: ReceivableRow) => void;
  onDeleteReceivable: (entry: ReceivableRow) => void;
};

export function ArchivedReceivablesModal({
  visible,
  onRequestClose,
  rows,
  loadingInitial,
  onRestoreReceivable,
  onDeleteReceivable,
}: ArchivedReceivablesModalProps) {
  const { colors } = useTheme();
  const [actionTarget, setActionTarget] = useState<ReceivableRow | null>(null);

  const actions = useMemo<ActionBottomSheetAction[]>(() => {
    return [
      {
        key: "restore",
        label: "Restore",
        Icon: RotateCcw,
        onPress: () => {
          if (!actionTarget) return;
          const target = actionTarget;
          setActionTarget(null);
          onRestoreReceivable(target);
        },
      },
      {
        key: "delete",
        label: "Delete",
        Icon: Trash,
        tone: "danger",
        onPress: () => {
          if (!actionTarget) return;
          const target = actionTarget;
          setActionTarget(null);
          onDeleteReceivable(target);
        },
      },
    ];
  }, [actionTarget, onDeleteReceivable, onRestoreReceivable]);

  return (
    <>
      <ArchiveModalShell
        visible={visible}
        onRequestClose={onRequestClose}
        title="Archived Receivables"
        accessibilityLabelClose="Close archived receivables"
      >
        {loadingInitial ? (
          <Text style={{ color: colors.mutedText }}>Loading archived receivables...</Text>
        ) : rows.length === 0 ? (
          <Text style={{ color: colors.mutedText }}>No archived receivables.</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(entry) => String(entry.id)}
            renderItem={({ item }) => {
              const paidAmount = item.paidAmount ?? 0;
              const amountLabel =
                paidAmount > 0
                  ? `Paid: ${php.format(paidAmount)}`
                  : `Total: ${php.format(item.amount)}`;

              const remaining = item.amount - (item.paidAmount ?? 0);
              const isSettled = remaining <= 0;
              const isPartial = !isSettled && (item.paidAmount ?? 0) > 0;

              return (
                <Pressable onPress={() => setActionTarget(item)}>
                  <InnerCard style={{ padding: 12, gap: 6 }}>
                    <View style={styles.row}>
                      <View style={styles.personColumn}>
                        <Text style={{ fontWeight: "700" }}>{item.person}</Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>{amountLabel}</Text>
                      </View>
                      <StatusBadge
                        label={
                          isSettled ? "Settled" : isPartial ? "Partially settled" : "Unsettled"
                        }
                        tone={isSettled ? "settled" : isPartial ? "partial" : "unpaid"}
                      />
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
        title={actionTarget ? `Actions for ${actionTarget.person}` : "Actions"}
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
  separator: {
    height: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  personColumn: {
    flex: 1,
  },
});
