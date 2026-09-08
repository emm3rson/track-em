import React from "react";
import { StyleSheet, View } from "react-native";
import { ModalCard } from "../../../components/ModalCard";
import { Card, Text } from "../../../components/Themed";
import { CloseIconButton } from "../../../components/ui/CloseIconButton";
import { ModalOverflowMenu, type OverflowMenuItem } from "../../../components/ui/ModalOverflowMenu";
import { spacing, typography } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import type { CreditRow, PayablePaymentRow } from "../types";
import { Pencil, Trash } from "lucide-react-native";

export type PayablePaymentHistoryModalProps = {
  visible: boolean;
  entry: CreditRow | null;
  payments: PayablePaymentRow[];
  loadingPayments: boolean;
  savingPayment: boolean;
  onClose: () => void;
  onEditPayment: (payment: PayablePaymentRow) => void;
  onDeletePayment: (payment: PayablePaymentRow) => void;
};

export function PaymentHistoryModal({
  visible,
  entry,
  payments,
  loadingPayments,
  savingPayment,
  onClose,
  onEditPayment,
  onDeletePayment,
}: PayablePaymentHistoryModalProps) {
  const { colors } = useTheme();

  return (
    <ModalCard
      visible={visible}
      onRequestClose={onClose}
      innerStyle={styles.modalInner}
      useCard={false}
      scrollable={false}
    >
      <View
        style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Payment History</Text>
            {entry ? (
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>{entry.platform}</Text>
            ) : null}
          </View>
          <CloseIconButton onPress={onClose} accessibilityLabel="Close payable payment history" />
        </View>

        <View style={styles.contentList}>
          {loadingPayments ? (
            <Text style={[styles.stateText, { color: colors.mutedText }]}>Loading...</Text>
          ) : payments.length === 0 ? (
            <Text style={[styles.stateText, { color: colors.mutedText }]}>
              No payments recorded yet.
            </Text>
          ) : (
            payments.map((payment) => {
              const paidAtLabel = new Date(payment.paidAt).toLocaleDateString("en-PH");
              const actions: OverflowMenuItem[] = [
                {
                  key: `edit-${payment.id}`,
                  label: "Edit",
                  icon: <Pencil size={18} color={colors.text} />,
                  disabled: savingPayment,
                  onPress: () => onEditPayment(payment),
                },
                {
                  key: `delete-${payment.id}`,
                  label: "Delete",
                  tone: "danger",
                  icon: <Trash size={18} color={colors.danger} />,
                  disabled: savingPayment,
                  onPress: () => onDeletePayment(payment),
                },
              ];

              return (
                <Card
                  key={payment.id}
                  style={[
                    styles.paymentCard,
                    {
                      backgroundColor: colors.surfaceAlt,
                      opacity: savingPayment ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={styles.paymentHeader}>
                    <Text
                      style={[styles.paymentDate, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {paidAtLabel}
                    </Text>
                    <View style={styles.paymentActions}>
                      <Text style={[styles.paymentAmount, { color: colors.text }]}>
                        {php.format(payment.amount)}
                      </Text>
                      <ModalOverflowMenu
                        actions={actions}
                        accessibilityLabel={`More actions for payable payment on ${paidAtLabel}`}
                      />
                    </View>
                  </View>
                  {payment.accountName ? (
                    <Text style={[styles.accountText, { color: colors.mutedText }]}>
                      Account: {payment.accountName}
                    </Text>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      </View>
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  modalInner: {
    width: "100%",
    maxHeight: "85%",
  },
  container: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  headerTextBlock: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: typography.body,
  },
  contentList: {
    gap: spacing.xs,
  },
  stateText: {
    fontSize: typography.body,
  },
  paymentCard: {
    padding: 12,
    gap: 4,
    borderWidth: 0,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  paymentDate: {
    fontWeight: "700",
    flex: 1,
  },
  paymentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  paymentAmount: {
    fontWeight: "800",
  },
  accountText: {
    fontSize: 12,
  },
});
