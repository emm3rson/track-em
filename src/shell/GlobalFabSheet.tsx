import React, { useMemo } from "react";

import {
  ActionBottomSheet,
  type ActionBottomSheetAction,
} from "../components/ui/ActionBottomSheet";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  ArrowRightLeft,
  Banknote,
  CreditCard,
  HandCoins,
  ShoppingBag,
  Wallet,
} from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { EntryAction } from "../navigation/types";

type GlobalFabSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: EntryAction) => void;
};

export function GlobalFabSheet({ visible, onClose, onSelectAction }: GlobalFabSheetProps) {
  const { colors } = useTheme();

  const actions = useMemo<ActionBottomSheetAction[]>(
    () => [
      {
        key: "expense",
        label: "Expense",
        tone: "danger",
        onPress: () => onSelectAction("expense"),
        Icon: ShoppingBag,
        iconTintColor: colors.badges.unpaid.text,
      },
      {
        key: "income",
        label: "Income",
        tone: "success",
        onPress: () => onSelectAction("income"),
        Icon: Wallet,
        iconTintColor: colors.badges.settled.text,
      },
      {
        key: "transfer",
        label: "Fund Transfer",
        onPress: () => onSelectAction("transfer"),
        Icon: ArrowRightLeft,
        iconTintColor: colors.badges.partial.text,
      },
      {
        key: "payable",
        label: "Payable",
        onPress: () => onSelectAction("payable"),
        Icon: CreditCard,
        iconTintColor: colors.badges.unpaid.text,
      },
      {
        key: "receivable",
        label: "Receivable",
        onPress: () => onSelectAction("receivable"),
        Icon: HandCoins,
        iconTintColor: colors.badges.settled.text,
      },
      {
        key: "lent-money",
        label: "Lent Money",
        onPress: () => onSelectAction("lent_money"),
        Icon: Banknote,
        iconTintColor: colors.badges.partial.text,
      },
      {
        key: "add-payable-payment",
        label: "Payable Payment",
        tone: "success",
        onPress: () => onSelectAction("add_payable_payment"),
        Icon: BanknoteArrowDown,
        iconTintColor: colors.badges.unpaid.text,
      },
      {
        key: "add-receivable-payment",
        label: "Receivable Payment",
        tone: "success",
        onPress: () => onSelectAction("add_receivable_payment"),
        Icon: BanknoteArrowUp,
        iconTintColor: colors.badges.settled.text,
      },
    ],
    [onSelectAction, colors.badges]
  );

  return (
    <ActionBottomSheet
      visible={visible}
      title="Quick Log"
      actions={actions}
      onClose={onClose}
      variant="grid-flat"
    />
  );
}
