import type {
  PayableDisplayStatus,
  AccountType,
  PayablePaymentWithDetails,
} from "../../data/types";

export type CreditRow = {
  id: number;
  platform: string;
  month: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentCount: number;
  latestPaidAt: string | null;
  status: PayableDisplayStatus;
  categoryId: number | null;
  categoryName: string | null;
  preferredAccountId: number | null;
};

export type PayableEntryTarget = {
  month: string;
  platform: string;
};

export type PayablesSnapshot = {
  rows: CreditRow[];
  months: string[];
  archivedMonths: string[];
  autoArchivedMonths: string[];
  statusTotalsByMonth: Map<string, { paid: number; remaining: number }>;
};

export type UpsertPayableInput = {
  platform: string;
  monthIsoAnchor: string;
  dueDateIso?: string | null;
  amount: number;
  status: "PAID" | "UNPAID";
  categoryId?: number | null;
  preferredAccountId?: number | null;
};

export type RecordPayablePaymentInput = {
  platform: string;
  monthIsoAnchor: string;
  amount: number;
  accountId?: number | null;
  categoryIdOverride?: number | null;
  paymentDateIso?: string | null;
};

export type PayablePaymentAccountRow = {
  id: number;
  name: string;
  type: AccountType;
  institution: string | null;
  balance: number;
};

export type PayablePaymentRow = Omit<PayablePaymentWithDetails, "amount"> & {
  amount: number;
};
