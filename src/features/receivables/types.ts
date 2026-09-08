import type {
  AccountType,
  ReceivablePaymentWithAccount,
  ReceivableWithPaid,
} from "../../data/types";

export type PeopleEntryPatch = {
  person?: string;
  amount?: number;
  date?: string;
  note?: string | null;
  settled?: 0 | 1;
  includeInTotal?: 0 | 1;
  targetPaymentDate?: string | null;
  preferredAccountId?: number | null;
};

export type ReceivableRow = Omit<
  ReceivableWithPaid,
  "amount" | "paidAmount" | "linkedTransactionId"
> & {
  amount: number;
  paidAmount: number;
  linkedLedgerEntryId: number | null;
};
export type PaymentRow = Omit<ReceivablePaymentWithAccount, "amount"> & { amount: number };
export type ReceivablePaymentAccountRow = {
  id: number;
  name: string;
  type: AccountType;
  institution: string | null;
  balance: number;
};

export type SaveReceivableInput = {
  mode: "add" | "edit";
  selectedEntry?: ReceivableRow | null;
  values: {
    person: string;
    amount: number;
    dateIso: string;
    note?: string | null;
    includeInTotal?: boolean;
    targetPaymentDate?: string | null;
    preferredAccountId?: number | null;
  };
};

export type EditReceivablePayload = {
  id: number;
  patch: PeopleEntryPatch;
  remaining: number;
};
