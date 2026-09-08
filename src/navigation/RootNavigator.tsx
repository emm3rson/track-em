import React, { useCallback } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useTheme } from "../theme/ThemeProvider";
import SettingsScreen from "../features/settings/screens/SettingsScreen";
import { AccountLedgerScreen } from "../features/app/accounts/screens/AccountLedgerScreen";
import { AddPayableScreen } from "../features/app/entry/screens/AddPayableScreen";
import { AddPayablePaymentScreen } from "../features/app/entry/screens/AddPayablePaymentScreen";
import { AddReceivablePaymentScreen } from "../features/app/entry/screens/AddReceivablePaymentScreen";
import { LogExpenseScreen } from "../features/app/entry/screens/LogExpenseScreen";
import { LogIncomeScreen } from "../features/app/entry/screens/LogIncomeScreen";
import { LogLentMoneyScreen } from "../features/app/entry/screens/LogLentMoneyScreen";
import { LogReceivableScreen } from "../features/app/entry/screens/LogReceivableScreen";
import { TransferFundsScreen } from "../features/app/entry/screens/TransferFundsScreen";
import { TransactionHistoryScreen } from "../features/app/dashboard/screens/TransactionHistoryScreen";
import { GlobalFabSheet } from "../shell/GlobalFabSheet";
import { TabNavigator } from "./tabs/TabNavigator";
import type { EntryAction, RootStackParamList } from "./types";
import { FabProvider, useFab } from "./FabContext";

const RootStack = createNativeStackNavigator<RootStackParamList>();

type EntryRouteName =
  | "EntryLogExpense"
  | "EntryLogIncome"
  | "EntryTransferFunds"
  | "EntryAddPayable"
  | "EntryLogReceivable"
  | "EntryLogLentMoney";

type NavigationEntryAction = Exclude<EntryAction, "add_payable_payment" | "add_receivable_payment">;

const ENTRY_ROUTES: Record<NavigationEntryAction, EntryRouteName> = {
  expense: "EntryLogExpense",
  income: "EntryLogIncome",
  transfer: "EntryTransferFunds",
  payable: "EntryAddPayable",
  receivable: "EntryLogReceivable",
  lent_money: "EntryLogLentMoney",
};

type RootNavigatorProps = {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

function RootNavigatorContent({ navigationRef }: RootNavigatorProps) {
  const { isFabVisible, closeFab } = useFab();
  const { colors } = useTheme();

  const handleSelectFabAction = useCallback(
    (action: EntryAction) => {
      closeFab();
      if (!navigationRef.isReady()) return;
      if (action === "add_payable_payment") {
        navigationRef.navigate("EntryAddPayablePayment");
        return;
      }
      if (action === "add_receivable_payment") {
        navigationRef.navigate("EntryAddReceivablePayment");
        return;
      }
      const routeName = ENTRY_ROUTES[action];
      navigationRef.navigate(routeName);
    },
    [closeFab, navigationRef]
  );

  return (
    <>
      <RootStack.Navigator
        screenOptions={{
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primaryBg },
          headerTintColor: colors.primaryText,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <RootStack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
        <RootStack.Screen
          name="AccountLedger"
          component={AccountLedgerScreen}
          options={({ route }) => ({
            title: route.params.accountName,
          })}
        />
        <RootStack.Screen
          name="TransactionHistory"
          component={TransactionHistoryScreen}
          options={{ title: "Transaction History" }}
        />
        <RootStack.Group screenOptions={{ presentation: "transparentModal", headerShown: false }}>
          <RootStack.Screen
            name="EntryLogExpense"
            component={LogExpenseScreen}
            options={{ title: "Log Expense" }}
          />
          <RootStack.Screen
            name="EntryLogIncome"
            component={LogIncomeScreen}
            options={{ title: "Log Income" }}
          />
          <RootStack.Screen
            name="EntryTransferFunds"
            component={TransferFundsScreen}
            options={{ title: "Transfer Funds" }}
          />
          <RootStack.Screen
            name="EntryAddPayable"
            component={AddPayableScreen}
            options={{ title: "Add Payable" }}
          />
          <RootStack.Screen
            name="EntryAddPayablePayment"
            component={AddPayablePaymentScreen}
            options={{ title: "Add Payable Payment" }}
          />
          <RootStack.Screen
            name="EntryLogReceivable"
            component={LogReceivableScreen}
            options={{ title: "Log Receivable" }}
          />
          <RootStack.Screen
            name="EntryAddReceivablePayment"
            component={AddReceivablePaymentScreen}
            options={{ title: "Add Receivable Payment" }}
          />
          <RootStack.Screen
            name="EntryLogLentMoney"
            component={LogLentMoneyScreen}
            options={{ title: "Lent Money" }}
          />
        </RootStack.Group>
      </RootStack.Navigator>

      <GlobalFabSheet
        visible={isFabVisible}
        onClose={closeFab}
        onSelectAction={handleSelectFabAction}
      />
    </>
  );
}

export function RootNavigator({ navigationRef }: RootNavigatorProps) {
  return (
    <FabProvider>
      <RootNavigatorContent navigationRef={navigationRef} />
    </FabProvider>
  );
}
