import type {
  CreditRow,
  PayablePaymentAccountRow,
  PayablesSnapshot as PayablesSnapshotBase,
} from "../../../features/payables/types";
import type {
  PaymentRow as PaymentRowBase,
  ReceivablePaymentAccountRow as ReceivablePaymentAccountRowBase,
  ReceivableRow,
} from "../../../features/receivables/types";

export type { CreditRow, PayablePaymentAccountRow, ReceivableRow };

export type PayableOverview = {
  platform: string;
  month: string;
  amount: number;
  status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  categoryId: number | null;
  categoryName: string | null;
};

export type PayablesSnapshot = PayablesSnapshotBase;

export type PayableEntryTarget = {
  month: string;
  platform: string;
};

export type ReceivableOverview = {
  id: number;
  person: string;
  amount: number;
  paidAmount: number;
};

export type ReceivablesSnapshot = {
  rows: ReceivableRow[];
  archivedCount: number;
};

export type PaymentRow = PaymentRowBase;
export type ReceivablePaymentAccountRow = ReceivablePaymentAccountRowBase;
