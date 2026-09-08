import { getDb } from "../getDb";
import * as transactionRepo from "../repositories/transactionRepo";
import * as accountRepo from "../repositories/accountRepo";
import * as expenseRepo from "../repositories/expenseRepo";
import * as expenseCategoryRepo from "../repositories/expenseCategoryRepo";
import { EntryKind } from "../types";

function generateTransferGroupId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `transfer_${ts}_${rand}`;
}

export async function createTransfer(params: {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  fee?: number;
  dateIso: string;
  note?: string | null;
}): Promise<string> {
  if (params.amount <= 0) throw new Error("Transfer amount must be positive.");
  if (params.fromAccountId === params.toAccountId) {
    throw new Error("Cannot transfer to the same account.");
  }

  const db = await getDb();
  const groupId = generateTransferGroupId();
  const fee = params.fee ?? 0;
  if (!Number.isFinite(fee) || fee < 0) {
    throw new Error("Transfer fee must be zero or greater.");
  }
  const now = new Date().toISOString();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    // Validate both accounts
    const fromAccount = await accountRepo.findActiveLinkable(db, params.fromAccountId);
    if (!fromAccount) throw new Error("Source account is not available.");
    const toAccount = await accountRepo.findActiveLinkable(db, params.toAccountId);
    if (!toAccount) throw new Error("Destination account is not available.");

    // Debit from source transfer amount only. Any fee is tracked separately
    // as an expense to preserve historical UX and reporting behavior.
    await transactionRepo.insert(db, {
      accountId: params.fromAccountId,
      date: params.dateIso,
      amount: -params.amount,
      entryKind: EntryKind.MANUAL,
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: groupId,
      note: params.note ?? "Transfer",
      createdAt: now,
    });

    // Credit to destination
    await transactionRepo.insert(db, {
      accountId: params.toAccountId,
      date: params.dateIso,
      amount: params.amount,
      entryKind: EntryKind.MANUAL,
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: groupId,
      note: params.note ?? "Transfer",
      createdAt: now,
    });

    if (fee > 0) {
      const transferFeeCategoryId = await ensureTransferFeeCategory(db);
      const feeNote = buildTransferFeeNote(fromAccount.name, toAccount.name, params.note);
      const expenseId = await expenseRepo.insert(db, {
        date: params.dateIso,
        amount: fee,
        categoryId: transferFeeCategoryId,
        accountId: fromAccount.id,
        note: feeNote,
        createdAt: now,
      });
      await transactionRepo.insert(db, {
        accountId: fromAccount.id,
        date: params.dateIso,
        amount: -fee,
        entryKind: EntryKind.EXPENSE_LINK,
        linkedExpenseId: expenseId,
        linkedReceivablePaymentId: null,
        linkedPayablePaymentId: null,
        transferGroupId: groupId,
        note: feeNote,
        createdAt: now,
      });
    }

    await db.execAsync("COMMIT;");
    return groupId;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function deleteTransfer(groupId: string): Promise<void> {
  const db = await getDb();
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const rows = await db.getAllAsync<{ linkedExpenseId: number | null }>(
      `SELECT linkedExpenseId FROM transactions WHERE transferGroupId = ? AND linkedExpenseId IS NOT NULL`,
      groupId
    );
    for (const row of rows) {
      if (row.linkedExpenseId != null) {
        await expenseRepo.deleteById(db, row.linkedExpenseId);
      }
    }
    await transactionRepo.deleteByTransferGroupId(db, groupId);
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

async function ensureTransferFeeCategory(db: Awaited<ReturnType<typeof getDb>>) {
  const existing = await expenseCategoryRepo.findByName(db, "Transfer Fees");
  if (existing) return existing.id;

  const sortOrder = (await expenseCategoryRepo.maxSortOrder(db)) + 1;
  return expenseCategoryRepo.insert(db, {
    name: "Transfer Fees",
    sortOrder,
    createdAt: new Date().toISOString(),
  });
}

function buildTransferFeeNote(
  fromAccountName: string,
  toAccountName: string,
  note?: string | null
) {
  const trimmedNote = note?.trim();
  return `Transfer fee: ${fromAccountName} -> ${toAccountName}${
    trimmedNote ? ` - ${trimmedNote}` : ""
  }`;
}
