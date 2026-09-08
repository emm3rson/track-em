import type { Db } from "./db";

const DEFAULT_CATEGORIES = [
  "Groceries",
  "Dine Out",
  "Utilities and Subscriptions",
  "Transportation",
  "Health & Supplements",
  "Personal Care",
  "Shopping",
  "Others",
];

export async function ensureExpenseCategoriesSeeded(db: Db) {
  const existing = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM expense_categories ORDER BY sortOrder ASC, id ASC;`
  );

  if (existing.length === 0) {
    const nowIso = new Date().toISOString();
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i += 1) {
      await db.runAsync(
        `INSERT INTO expense_categories (name, sortOrder, createdAt)
         VALUES (?, ?, ?)`,
        DEFAULT_CATEGORIES[i],
        i + 1,
        nowIso
      );
    }
    return;
  }

  await ensureOthersCategory(db);
}

async function ensureOthersCategory(db: Db) {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM expense_categories WHERE lower(trim(name)) IN ('others', 'other') LIMIT 1`
  );
  if (row) return;

  const maxSort = await db.getFirstAsync<{ maxSort: number | null }>(
    `SELECT MAX(sortOrder) AS maxSort FROM expense_categories`
  );
  const nextSort = (maxSort?.maxSort ?? 0) + 1;
  await db.runAsync(
    `INSERT INTO expense_categories (name, sortOrder, createdAt) VALUES (?, ?, ?)`,
    "Others",
    nextSort,
    new Date().toISOString()
  );
}

type SavingsAccountSeed = {
  name: string;
  institution: string;
  initialBalance: number;
  goalAmount: number;
  category?: "SAVINGS" | "INVESTMENT";
};

type CashflowSeed = {
  accountName: string;
  dateIso: string;
  amount: number;
  note: string;
};

type ReceivableSeed = {
  person: string;
  amount: number;
  dateIso: string;
  note: string;
  settled: boolean;
  includeInTotal?: boolean;
  fullyPaid?: boolean;
};

type PayableSeed = {
  billerName: string;
  monthIsoAnchor: string;
  amount: number;
  status: "PAID" | "UNPAID";
  categoryName: string;
};

export async function seedDemoData(db: Db) {
  const { resetAllData } = await import("./reset");

  await resetAllData(db);
  await ensureExpenseCategoriesSeeded(db);

  const nowIso = new Date().toISOString();
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const twoMonthsStart = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  const isoDate = (value: Date) => value.toISOString().slice(0, 10);
  const isoMonthAnchor = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-01`;
  const dateFrom = (anchor: Date, day: number) =>
    isoDate(new Date(anchor.getFullYear(), anchor.getMonth(), day));
  const toCents = (value: number) => Math.round(value * 100);

  const walletAccounts = [
    { name: "Cash", institution: "", balance: 3500 },
    { name: "GCash Wallet", institution: "GCash", balance: 14250 },
    { name: "BPI Payroll", institution: "BPI", balance: 52500 },
    { name: "Maya Wallet", institution: "Maya", balance: 9800 },
  ];

  for (const account of walletAccounts) {
    await db.runAsync(
      `INSERT INTO accounts (name, type, institution, initialBalance, goalAmount, accountCategory, includeInTotals, archived, createdAt)
       VALUES (?, 'SOURCE', ?, ?, NULL, NULL, 1, 0, ?)`,
      account.name,
      account.institution,
      toCents(account.balance),
      nowIso
    );
  }

  const savingsAccountSeeds: SavingsAccountSeed[] = [
    {
      name: "BDO Emergency Fund",
      institution: "BDO",
      initialBalance: 125000,
      goalAmount: 300000,
    },
    {
      name: "CIMB UpSave",
      institution: "CIMB",
      initialBalance: 48000,
      goalAmount: 150000,
    },
    {
      name: "Pag-IBIG MP2",
      institution: "Pag-IBIG",
      initialBalance: 36000,
      goalAmount: 200000,
    },
    {
      name: "FirstMetroSec Equity",
      institution: "FirstMetroSec",
      initialBalance: 24000,
      goalAmount: 180000,
      category: "INVESTMENT",
    },
  ];

  const savingsAccountIds: Record<string, number> = {};
  for (const seed of savingsAccountSeeds) {
    const result = await db.runAsync(
      `INSERT INTO accounts (name, type, institution, initialBalance, goalAmount, accountCategory, includeInTotals, archived, createdAt)
       VALUES (?, 'SAVINGS', ?, ?, ?, ?, 1, 0, ?)`,
      seed.name,
      seed.institution,
      toCents(seed.initialBalance),
      toCents(seed.goalAmount),
      seed.category ?? "SAVINGS",
      nowIso
    );
    savingsAccountIds[seed.name] = Number(result.lastInsertRowId);
  }

  const cashflowSeeds: CashflowSeed[] = [
    {
      accountName: "BDO Emergency Fund",
      dateIso: dateFrom(previousMonthStart, 25),
      amount: 18000,
      note: "13th-month pay allocation",
    },
    {
      accountName: "BDO Emergency Fund",
      dateIso: dateFrom(currentMonthStart, 6),
      amount: 4000,
      note: "Auto-transfer from payroll",
    },
    {
      accountName: "BDO Emergency Fund",
      dateIso: dateFrom(currentMonthStart, 16),
      amount: -2500,
      note: "Moved to short-term time deposit",
    },
    {
      accountName: "CIMB UpSave",
      dateIso: dateFrom(previousMonthStart, 19),
      amount: 3500,
      note: "Monthly savings top-up",
    },
    {
      accountName: "CIMB UpSave",
      dateIso: dateFrom(currentMonthStart, 9),
      amount: 5200,
      note: "Freelance project allocation",
    },
    {
      accountName: "Pag-IBIG MP2",
      dateIso: dateFrom(previousMonthStart, 21),
      amount: 3000,
      note: "Quarterly MP2 contribution",
    },
    {
      accountName: "Pag-IBIG MP2",
      dateIso: dateFrom(currentMonthStart, 11),
      amount: 3000,
      note: "Additional MP2 contribution",
    },
    {
      accountName: "FirstMetroSec Equity",
      dateIso: dateFrom(currentMonthStart, 14),
      amount: 4200,
      note: "Peso-cost averaging buy-in",
    },
  ];

  for (const tx of cashflowSeeds) {
    const accountId = savingsAccountIds[tx.accountName];
    if (!accountId) continue;
    await db.runAsync(
      `INSERT INTO transactions (
         accountId, date, amount, entryKind,
         linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId,
         transferGroupId, note, createdAt
       ) VALUES (?, ?, ?, 'MANUAL', NULL, NULL, NULL, NULL, ?, ?)`,
      accountId,
      tx.dateIso,
      toCents(tx.amount),
      tx.note,
      nowIso
    );
  }

  const receivables: ReceivableSeed[] = [
    {
      person: "Kuya Benjie (Trike Coop)",
      amount: 4200,
      dateIso: dateFrom(currentMonthStart, 10),
      note: "Advanced boundary and fuel cash",
      settled: false,
    },
    {
      person: "Ate Grace",
      amount: 2600,
      dateIso: dateFrom(previousMonthStart, 27),
      note: "Shared internet bill advance",
      settled: false,
    },
    {
      person: "Barangay Sports Team",
      amount: 7800,
      dateIso: dateFrom(previousMonthStart, 14),
      note: "Uniform down payment I covered",
      settled: true,
      fullyPaid: true,
    },
    {
      person: "Sari-sari Store Group Order",
      amount: 9600,
      dateIso: dateFrom(currentMonthStart, 4),
      note: "Pending reimbursement from neighborhood order",
      settled: false,
      includeInTotal: false,
    },
    {
      person: "Tito Mario",
      amount: 1800,
      dateIso: dateFrom(previousMonthStart, 6),
      note: "Paid full share for barangay permit processing",
      settled: true,
      fullyPaid: true,
    },
  ];

  for (const entry of receivables) {
    const result = await db.runAsync(
      `INSERT INTO receivables (
         person, amount, date, note, settled, includeInTotal, archived,
         targetPaymentDate, linkedTransactionId, preferredAccountId, createdAt
       ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, ?)`,
      entry.person,
      toCents(entry.amount),
      entry.dateIso,
      entry.note,
      entry.settled ? 1 : 0,
      entry.includeInTotal === false ? 0 : 1,
      nowIso
    );

    if (entry.fullyPaid) {
      const receivableId = Number(result.lastInsertRowId ?? 0);
      await db.runAsync(
        `INSERT INTO receivable_payments (receivableId, accountId, amount, note, createdAt)
         VALUES (?, NULL, ?, ?, ?)`,
        receivableId,
        toCents(entry.amount),
        "Settled in full",
        nowIso
      );
    }
  }

  const categories = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM expense_categories ORDER BY sortOrder ASC, id ASC`
  );
  const categoryByName = new Map(
    categories.map((category) => [category.name.trim().toLowerCase(), category.id])
  );
  const fallbackCategoryId =
    categoryByName.get("others") ?? categoryByName.get("other") ?? categories[0]?.id ?? null;
  const pickCategoryId = (name: string) =>
    categoryByName.get(name.trim().toLowerCase()) ?? fallbackCategoryId;

  const payableSeeds: PayableSeed[] = [
    {
      billerName: "Water District",
      monthIsoAnchor: isoMonthAnchor(previousMonthStart),
      amount: 980,
      status: "PAID",
      categoryName: "Utilities and Subscriptions",
    },
    {
      billerName: "Condo Association Dues",
      monthIsoAnchor: isoMonthAnchor(previousMonthStart),
      amount: 2850,
      status: "PAID",
      categoryName: "Utilities and Subscriptions",
    },
    {
      billerName: "Meralco",
      monthIsoAnchor: isoMonthAnchor(currentMonthStart),
      amount: 4120,
      status: "UNPAID",
      categoryName: "Utilities and Subscriptions",
    },
    {
      billerName: "Globe Postpaid",
      monthIsoAnchor: isoMonthAnchor(currentMonthStart),
      amount: 1499,
      status: "PAID",
      categoryName: "Utilities and Subscriptions",
    },
    {
      billerName: "PLDT Fiber",
      monthIsoAnchor: isoMonthAnchor(nextMonthStart),
      amount: 1899,
      status: "UNPAID",
      categoryName: "Utilities and Subscriptions",
    },
    {
      billerName: "Home Credit",
      monthIsoAnchor: isoMonthAnchor(nextMonthStart),
      amount: 6350,
      status: "UNPAID",
      categoryName: "Shopping",
    },
    {
      billerName: "UnionBank Visa",
      monthIsoAnchor: isoMonthAnchor(nextMonthStart),
      amount: 9200,
      status: "UNPAID",
      categoryName: "Shopping",
    },
    {
      billerName: "EastWest Credit Card",
      monthIsoAnchor: isoMonthAnchor(twoMonthsStart),
      amount: 7600,
      status: "UNPAID",
      categoryName: "Shopping",
    },
    {
      billerName: "Shopee",
      monthIsoAnchor: isoMonthAnchor(twoMonthsStart),
      amount: 1850,
      status: "UNPAID",
      categoryName: "Shopping",
    },
    {
      billerName: "Lazada",
      monthIsoAnchor: isoMonthAnchor(twoMonthsStart),
      amount: 1320,
      status: "UNPAID",
      categoryName: "Shopping",
    },
  ];

  for (const payable of payableSeeds) {
    const categoryId = pickCategoryId(payable.categoryName);
    if (categoryId == null) continue;

    const billerResult = await db.runAsync(
      `INSERT INTO billers (name, defaultCategoryId, defaultAccountId, archived, createdAt)
       VALUES (?, ?, NULL, 0, ?)
       ON CONFLICT(name) DO UPDATE SET defaultCategoryId = excluded.defaultCategoryId`,
      payable.billerName,
      categoryId,
      nowIso
    );
    const billerRow = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM billers WHERE lower(trim(name)) = ? LIMIT 1`,
      payable.billerName.trim().toLowerCase()
    );
    const billerId = billerRow?.id ?? Number(billerResult.lastInsertRowId);
    await db.runAsync(
      `INSERT INTO payables (billerId, month, dueDate, amount, status, categoryId, archived, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      billerId,
      payable.monthIsoAnchor,
      payable.monthIsoAnchor,
      toCents(payable.amount),
      payable.status,
      categoryId,
      nowIso
    );
  }

  await seedDemoExpensesIfEmpty(db);
}

export async function seedDemoExpensesIfEmpty(db: Db) {
  const existing = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(1) AS count FROM expenses`
  );
  if ((existing?.count ?? 0) > 0) return;

  await ensureExpenseCategoriesSeeded(db);
  const categories = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, name FROM expense_categories ORDER BY sortOrder ASC, id ASC`
  );
  const byName = new Map(
    categories.map((category) => [category.name.trim().toLowerCase(), category.id])
  );
  const otherId = byName.get("others") ?? byName.get("other") ?? categories[0]?.id ?? null;
  const pickCategoryId = (name: string) => byName.get(name.trim().toLowerCase()) ?? otherId;
  const base = new Date();
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
  const dateFor = (day: number) =>
    new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toISOString().slice(0, 10);
  const toCents = (value: number) => Math.round(value * 100);

  const seeds = [
    { name: "Groceries", amount: 4200, day: 3, note: "Palengke and rice restock" },
    { name: "Dine Out", amount: 1350, day: 5, note: "Carinderia catch-up with cousins" },
    {
      name: "Utilities and Subscriptions",
      amount: 3950,
      day: 7,
      note: "Electricity share plus app renewals",
    },
    { name: "Transportation", amount: 1100, day: 10, note: "Jeepney and MRT reload" },
    { name: "Health & Supplements", amount: 1200, day: 12, note: "Medicine and vitamin refill" },
    { name: "Personal Care", amount: 900, day: 15, note: "Toiletries and grooming supplies" },
    { name: "Shopping", amount: 1850, day: 18, note: "Household and school supplies order" },
    { name: "Others", amount: 450, day: 21, note: "Barangay event contribution" },
  ];

  for (const seed of seeds) {
    const categoryId = pickCategoryId(seed.name);
    if (categoryId == null) continue;
    await db.runAsync(
      `INSERT INTO expenses (date, amount, categoryId, accountId, note, createdAt)
       VALUES (?, ?, ?, NULL, ?, ?)`,
      dateFor(seed.day),
      toCents(seed.amount),
      categoryId,
      seed.note,
      new Date().toISOString()
    );
  }
}
