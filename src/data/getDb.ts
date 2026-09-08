import { type Db, initDb, openDb } from "./db";
import { getCachedDemoMode, getDemoModeEnabled, setDemoModeEnabled } from "../utils/demoMode";
import { logger } from "../utils/logger";

let dbPromise: Promise<Db> | null = null;
let activeDbName: string | null = null;
let activeDb: Db | null = null;
let demoModeSwitchPromise: Promise<void> | null = null;

const PRIMARY_DB_NAME = "finance_tracker_v2.db";
const DEMO_DB_NAME = "finance_tracker_v2_demo.db";

type ClosableDb = Db & {
  closeAsync: () => Promise<void>;
};

function hasCloseAsync(db: Db | null): db is ClosableDb {
  return !!db && "closeAsync" in db && typeof db.closeAsync === "function";
}

function resolveDbName(demoMode: boolean) {
  return demoMode ? DEMO_DB_NAME : PRIMARY_DB_NAME;
}

export function getDb() {
  const cachedDemoMode = getCachedDemoMode();
  if (dbPromise && cachedDemoMode !== null) {
    const desiredName = resolveDbName(cachedDemoMode);
    if (activeDbName && activeDbName !== desiredName) {
      dbPromise = null;
      activeDbName = null;
    }
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      if (demoModeSwitchPromise) {
        await demoModeSwitchPromise;
      }
      const demoEnabled = await getDemoModeEnabled();
      const dbName = resolveDbName(demoEnabled);
      activeDbName = dbName;
      let db = await openDb(dbName);
      let attempts = 0;
      while (true) {
        try {
          await initDb(db);
          break;
        } catch (error) {
          attempts += 1;
          logger.error("data/getDb", "DB init failed, retrying", error, {
            attempts,
          });
          if (attempts >= 3) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
          db = await openDb(dbName);
        }
      }
      activeDb = db;
      return db;
    })();
  }
  return dbPromise;
}

export async function setDemoMode(enabled: boolean) {
  if (demoModeSwitchPromise) {
    await demoModeSwitchPromise;
  }
  demoModeSwitchPromise = (async () => {
    if (hasCloseAsync(activeDb)) {
      try {
        await activeDb.closeAsync();
      } catch (error) {
        logger.error("data/getDb", "Close DB failed", error);
      } finally {
        activeDb = null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
    await setDemoModeEnabled(enabled);
    dbPromise = null;
    activeDbName = null;
  })();
  try {
    await demoModeSwitchPromise;
  } finally {
    demoModeSwitchPromise = null;
  }
}

export function resetDbCache(): void {
  dbPromise = null;
  activeDbName = null;
  activeDb = null;
}
