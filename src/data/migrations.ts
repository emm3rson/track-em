import { logger } from "../utils/logger";
import type { Db } from "./db";

export type Migration = {
  version: number;
  name: string;
  run: (db: Db) => Promise<void>;
};

async function getUserVersion(db: Db) {
  const row = (await db.getFirstAsync<Record<string, unknown>>(`PRAGMA user_version;`)) ?? {};
  if ("user_version" in row) {
    return Number(row.user_version ?? 0);
  }
  const firstValue = Object.values(row)[0];
  return Number(firstValue ?? 0);
}

async function setUserVersion(db: Db, version: number) {
  await db.execAsync(`PRAGMA user_version = ${version};`);
  const applied = await getUserVersion(db);
  if (applied !== version) {
    throw new Error(`Failed to persist user_version=${version}. Current value: ${applied}`);
  }
}

function validateMigrations(migrations: Migration[]) {
  const versions = new Set<number>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }
    if (versions.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    versions.add(migration.version);
  }
}

export async function runMigrations(db: Db, migrations: Migration[]) {
  if (migrations.length === 0) return;
  validateMigrations(migrations);

  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  const currentVersion = await getUserVersion(db);

  for (const migration of ordered) {
    if (migration.version <= currentVersion) continue;
    logger.info("data/migrations", `Running migration ${migration.version}: ${migration.name}`);
    await migration.run(db);
    await setUserVersion(db, migration.version);
    logger.info("data/migrations", `Applied migration ${migration.version}: ${migration.name}`);
  }
}
