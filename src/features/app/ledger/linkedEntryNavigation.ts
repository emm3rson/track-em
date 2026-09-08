import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../../navigation/types";
import type { LedgerEntryActionTarget } from "./types";
import { resolveLinkedLedgerDestination } from "../../cashflow/service";

export async function navigateToLinkedEntryEditor(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  entry: LedgerEntryActionTarget
): Promise<boolean> {
  const destination = await resolveLinkedLedgerDestination(entry);
  if (!destination) return false;

  const launchNonce = Date.now();

  if (destination.kind === "expense") {
    navigation.navigate("MainTabs", {
      screen: "Expenses",
      params: {
        launchAction: "editExpense",
        expenseId: destination.expenseId,
        launchNonce,
      },
    });
    return true;
  }

  if (destination.kind === "payablePayment") {
    navigation.navigate("MainTabs", {
      screen: "Obligations",
      params: {
        launchAction: "editPayablePayment",
        payablePaymentId: destination.paymentId,
        payableMonth: destination.month,
        payablePlatform: destination.platform,
        launchNonce,
      },
    });
    return true;
  }

  if (destination.kind === "receivablePayment") {
    navigation.navigate("MainTabs", {
      screen: "Obligations",
      params: {
        launchAction: "editReceivablePayment",
        receivableId: destination.receivableId,
        receivablePaymentId: destination.paymentId,
        launchNonce,
      },
    });
    return true;
  }

  navigation.navigate("MainTabs", {
    screen: "Obligations",
    params: {
      launchAction: "editReceivable",
      receivableId: destination.receivableId,
      launchNonce,
    },
  });
  return true;
}
