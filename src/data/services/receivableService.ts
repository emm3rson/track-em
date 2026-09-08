import { getDb } from "../getDb";
import * as receivableRepo from "../repositories/receivableRepo";
import * as receivablePaymentRepo from "../repositories/receivablePaymentRepo";
import * as transactionRepo from "../repositories/transactionRepo";
import * as accountRepo from "../repositories/accountRepo";
import { EntryKind, type ReceivableWithPaid } from "../types";

// ─── Queries ─────────────────────────────────────────

export async function listActive(): Promise<ReceivableWithPaid[]> {
  const db = await getDb();
  await autoArchiveSettled(db);
  return receivableRepo.findAllWithPaid(db, { archived: 0 });
}

export async function listArchived(params?: {
  limit?: number;
  offset?: number;
}): Promise<ReceivableWithPaid[]> {
  const db = await getDb();
  return receivableRepo.findAllWithPaid(db, {
    archived: 1,
    ...params,
  });
}

export async function countArchived(): Promise<number> {
  const db = await getDb();
  return receivableRepo.countArchived(db);
}

export async function sumOwed(): Promise<number> {
  const db = await getDb();
  return receivableRepo.sumOwed(db);
}

export async function getById(id: number): Promise<ReceivableWithPaid | null> {
  const db = await getDb();
  return receivableRepo.findByIdWithPaid(db, id);
}

// ─── CRUD ────────────────────────────────────────────

export async function createReceivable(params: {
  person: string;
  amount: number;
  dateIso: string;
  note?: string | null;
  targetPaymentDate?: string | null;
  preferredAccountId?: number | null;
}): Promise<number> {
  if (params.amount <= 0) throw new Error("Amount must be positive.");
  const db = await getDb();
  return receivableRepo.insert(db, {
    person: params.person,
    amount: params.amount,
    date: params.dateIso,
    note: params.note ?? null,
    settled: 0,
    includeInTotal: 1,
    archived: 0,
    targetPaymentDate: params.targetPaymentDate ?? null,
    linkedTransactionId: null,
    preferredAccountId: params.preferredAccountId ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function updateReceivable(
  id: number,
  patch: {
    person?: string;
    amount?: number;
    date?: string;
    note?: string | null;
    includeInTotal?: 0 | 1;
    targetPaymentDate?: string | null;
    preferredAccountId?: number | null;
  }
): Promise<void> {
  if (typeof patch.amount === "number" && patch.amount <= 0) {
    throw new Error("Amount must be positive.");
  }
  const db = await getDb();
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const existing = await receivableRepo.findById(db, id);
    if (!existing) throw new Error("Receivable not found.");

    if (typeof patch.amount === "number") {
      const paidTotal = await receivablePaymentRepo.sumByReceivableId(db, id);
      if (patch.amount < paidTotal) {
        throw new Error("Receivable amount cannot be lower than the total already paid.");
      }
    }

    await receivableRepo.update(db, id, patch);

    // Keep the lent-money outflow in sync: the ledger transaction is the
    // balance-affecting side of amount/date edits.
    if (
      existing.linkedTransactionId != null &&
      (typeof patch.amount === "number" || typeof patch.date === "string")
    ) {
      const linkedTx = await transactionRepo.findById(db, existing.linkedTransactionId);
      if (!linkedTx) {
        throw new Error(
          "The linked ledger entry for this lent money could not be found. Delete and recreate the receivable to repair it."
        );
      }
      await transactionRepo.update(db, linkedTx.id, {
        date: typeof patch.date === "string" ? patch.date : undefined,
        amount: typeof patch.amount === "number" ? -patch.amount : undefined,
      });
    }

    if (typeof patch.amount === "number") {
      await syncSettledStatus(db, id, patch.amount);
    }
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function archiveReceivable(id: number): Promise<void> {
  const db = await getDb();
  await receivableRepo.setArchived(db, id, 1);
}

export async function restoreReceivable(id: number): Promise<void> {
  const db = await getDb();
  await receivableRepo.setArchived(db, id, 0);
}

export async function setIncludeInTotal(id: number, include: 0 | 1): Promise<void> {
  const db = await getDb();
  await receivableRepo.setIncludeInTotal(db, id, include);
}

export async function deleteReceivable(id: number): Promise<void> {
  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const receivable = await receivableRepo.findById(db, id);
    if (!receivable) throw new Error("Receivable not found.");

    // Delete all payment-linked transactions
    const payments = await receivablePaymentRepo.listAllByReceivableId(db, id);
    for (const payment of payments) {
      await transactionRepo.deleteByLinkedReceivablePaymentId(db, payment.id);
    }

    // Delete receivable (CASCADE deletes payments)
    await receivableRepo.deleteById(db, id);

    // Delete lent-money linked transaction if exists
    if (receivable.linkedTransactionId != null) {
      await transactionRepo.deleteById(db, receivable.linkedTransactionId);
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

// ─── Payments ────────────────────────────────────────

export async function recordPayment(params: {
  receivableId: number;
  amount: number;
  note?: string | null;
  accountId?: number | null;
  person: string;
}): Promise<number> {
  if (params.amount <= 0) throw new Error("Payment amount must be positive.");
  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const receivable = await receivableRepo.findById(db, params.receivableId);
    if (!receivable) throw new Error("Receivable not found.");
    const paidTotal = await receivablePaymentRepo.sumByReceivableId(db, params.receivableId);
    const remaining = Math.max(0, receivable.amount - paidTotal);
    if (params.amount > remaining) {
      throw new Error("Payment exceeds remaining balance.");
    }

    let selectedAccount: { id: number; name: string } | null = null;
    if (params.accountId != null) {
      const acc = await accountRepo.findActiveLinkable(db, params.accountId);
      if (!acc) throw new Error("Selected account is no longer available.");
      selectedAccount = acc;
    }

    const now = new Date().toISOString();
    const paymentId = await receivablePaymentRepo.insert(db, {
      receivableId: params.receivableId,
      accountId: selectedAccount?.id ?? null,
      amount: params.amount,
      note: params.note ?? null,
      createdAt: now,
    });

    if (selectedAccount) {
      const txNote = getPaymentNote(params.person, params.note);
      await transactionRepo.insert(db, {
        accountId: selectedAccount.id,
        date: now.slice(0, 10),
        amount: params.amount, // inflow (positive)
        entryKind: EntryKind.RECEIVABLE_PAYMENT_LINK,
        linkedExpenseId: null,
        linkedReceivablePaymentId: paymentId,
        linkedPayablePaymentId: null,
        transferGroupId: null,
        note: txNote,
        createdAt: now,
      });
    }

    // BUG FIX #4: settled is exclusively auto-computed
    await syncSettledStatus(db, params.receivableId, receivable.amount);

    await db.execAsync("COMMIT;");
    return paymentId;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function updatePayment(params: {
  paymentId: number;
  receivableId: number;
  amount: number;
  note?: string | null;
  person: string;
}): Promise<void> {
  if (params.amount <= 0) throw new Error("Payment amount must be positive.");
  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payment = await receivablePaymentRepo.findByIdForReceivable(
      db,
      params.paymentId,
      params.receivableId
    );
    if (!payment) throw new Error("Payment not found.");

    const receivableForLimit = await receivableRepo.findById(db, params.receivableId);
    if (!receivableForLimit) throw new Error("Receivable not found.");
    const currentTotal = await receivablePaymentRepo.sumByReceivableId(db, params.receivableId);
    const remainingTotal = Math.max(0, receivableForLimit.amount - currentTotal + payment.amount);
    if (params.amount > remainingTotal) {
      throw new Error("Payment exceeds remaining balance.");
    }

    // Update linked transaction amount if exists
    if (payment.accountId != null) {
      const txNote = getPaymentNote(params.person, params.note);
      await transactionRepo.upsertLinkedEntry(db, {
        accountId: payment.accountId,
        date: payment.createdAt.slice(0, 10),
        amount: params.amount,
        note: txNote,
        kind: "RECEIVABLE_PAYMENT_LINK",
        linkedId: payment.id,
      });
    }

    await receivablePaymentRepo.update(db, params.paymentId, {
      amount: params.amount,
      note: params.note ?? null,
    });

    const receivable = await receivableRepo.findById(db, params.receivableId);
    if (receivable) {
      await syncSettledStatus(db, params.receivableId, receivable.amount);
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function deletePayment(params: {
  paymentId: number;
  receivableId: number;
}): Promise<void> {
  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payment = await receivablePaymentRepo.findByIdForReceivable(
      db,
      params.paymentId,
      params.receivableId
    );
    if (!payment) throw new Error("Payment not found.");

    // Delete linked transaction
    await transactionRepo.deleteByLinkedReceivablePaymentId(db, payment.id);

    // Delete payment
    await receivablePaymentRepo.deleteById(db, params.paymentId);

    // Re-sync settled status
    const receivable = await receivableRepo.findById(db, params.receivableId);
    if (receivable) {
      await syncSettledStatus(db, params.receivableId, receivable.amount);
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function listPayments(receivableId: number) {
  const db = await getDb();
  return receivablePaymentRepo.listByReceivableId(db, receivableId);
}

export async function getPayment(paymentId: number) {
  const db = await getDb();
  return receivablePaymentRepo.findByIdWithAccount(db, paymentId);
}

export async function findByLinkedTransactionId(transactionId: number) {
  const db = await getDb();
  return receivableRepo.findByLinkedTransactionId(db, transactionId);
}

// ─── Lent money ──────────────────────────────────────

export async function logLentMoney(params: {
  person: string;
  amount: number;
  dateIso: string;
  note?: string | null;
  targetPaymentDate?: string | null;
  accountId: number;
}): Promise<{ receivableId: number; ledgerEntryId: number }> {
  if (params.amount <= 0) throw new Error("Amount must be positive.");
  const db = await getDb();

  const account = await accountRepo.findActiveLinkable(db, params.accountId);
  if (!account) throw new Error("Selected account is no longer available.");

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const now = new Date().toISOString();

    // Create outflow transaction
    const ledgerEntryId = await transactionRepo.insert(db, {
      accountId: account.id,
      date: params.dateIso,
      amount: -params.amount,
      entryKind: EntryKind.LENT_MONEY_LINK,
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: null,
      note: `Lent to ${params.person}${params.note ? ` - ${params.note}` : ""}`,
      createdAt: now,
    });

    // Create receivable with back-pointer
    const receivableId = await receivableRepo.insert(db, {
      person: params.person,
      amount: params.amount,
      date: params.dateIso,
      note: params.note ?? null,
      settled: 0,
      includeInTotal: 1,
      archived: 0,
      targetPaymentDate: params.targetPaymentDate ?? null,
      linkedTransactionId: ledgerEntryId,
      preferredAccountId: account.id,
      createdAt: now,
    });

    await db.execAsync("COMMIT;");
    return { receivableId, ledgerEntryId };
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

// ─── Internal helpers ────────────────────────────────

/**
 * BUG FIX #4: settled is exclusively auto-computed.
 * No manual toggle exposed.
 */
async function syncSettledStatus(
  db: Awaited<ReturnType<typeof getDb>>,
  receivableId: number,
  receivableAmount: number
): Promise<void> {
  const paidTotal = await receivablePaymentRepo.sumByReceivableId(db, receivableId);
  const shouldBeSettled = paidTotal >= receivableAmount ? 1 : 0;

  const current = await receivableRepo.findById(db, receivableId);
  if (!current) return;

  if (current.settled !== shouldBeSettled) {
    await receivableRepo.setSettled(db, receivableId, shouldBeSettled as 0 | 1);
  }
  // Auto-archive fully settled
  if (shouldBeSettled === 1 && current.archived === 0) {
    await receivableRepo.setArchived(db, receivableId, 1);
  }
  // Un-settling (payment deleted/reduced or principal raised) must resurface
  // the receivable; otherwise it stays invisible in listActive forever.
  if (shouldBeSettled === 0 && current.settled === 1 && current.archived === 1) {
    await receivableRepo.setArchived(db, receivableId, 0);
  }
}

async function autoArchiveSettled(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  const unsettled = await receivableRepo.findFullyPaidUnsettled(db);
  for (const { id } of unsettled) {
    await receivableRepo.setSettled(db, id, 1);
    await receivableRepo.setArchived(db, id, 1);
  }
}

function getPaymentNote(person: string, note?: string | null): string {
  const base = `Receivable payment: ${person}`;
  const trimmed = note?.trim();
  if (!trimmed) return base;
  return `${base} - ${trimmed}`;
}
