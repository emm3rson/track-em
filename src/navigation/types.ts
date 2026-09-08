import type { NavigatorScreenParams } from "@react-navigation/native";

import type { LedgerEntryActionTarget } from "../features/app/ledger/types";
import type { AccountType } from "../data/types";

export type EntryAction =
  | "expense"
  | "income"
  | "transfer"
  | "payable"
  | "receivable"
  | "lent_money"
  | "add_payable_payment"
  | "add_receivable_payment";

export type AccountScopedEntryContext = {
  accountId: number;
  accountName: string;
};

export type TabParamList = {
  Dashboard: undefined;
  Expenses:
    | {
        launchAction?: "editExpense";
        expenseId?: number;
        launchNonce?: number;
      }
    | undefined;
  Accounts: undefined;
  Obligations:
    | {
        launchAction?:
          | "addPayablePayment"
          | "addReceivablePayment"
          | "openPayablePayment"
          | "editPayablePayment"
          | "editReceivable"
          | "editReceivablePayment";
        payableMonth?: string;
        payablePlatform?: string;
        payablePaymentId?: number;
        receivableId?: number;
        receivablePaymentId?: number;
        launchNonce?: number;
      }
    | undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Settings: undefined;
  AccountLedger: { accountId: number; accountName: string; accountType: AccountType };
  TransactionHistory:
    | {
        initialEntry?: LedgerEntryActionTarget;
        initialMode?: "actions" | "edit";
      }
    | undefined;
  EntryLogExpense:
    | {
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
  EntryLogIncome:
    | {
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
  EntryTransferFunds:
    | {
        scopedAccount?: AccountScopedEntryContext;
        lockedDirection?: "from" | "to";
      }
    | undefined;
  EntryAddPayable:
    | {
        defaultMonth?: string;
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
  EntryAddPayablePayment:
    | {
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
  EntryLogReceivable:
    | {
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
  EntryAddReceivablePayment:
    | {
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
  EntryLogLentMoney:
    | {
        scopedAccount?: AccountScopedEntryContext;
      }
    | undefined;
};
