import {
  backupService,
  getDb,
  resetAllData,
  seedDemoData,
  setDemoMode as setDemoModeStorage,
} from "../../data";

export async function exportBackupPayload() {
  const db = await getDb();
  return backupService.buildBackupPayload(db);
}

export function validateBackupFile(rawJsonString: string) {
  return backupService.validateBackupPayload(JSON.parse(rawJsonString));
}

export async function restoreBackup(
  payload: ReturnType<typeof backupService.validateBackupPayload>
) {
  const db = await getDb();
  return backupService.restoreBackupPayload(payload, db);
}

export async function resetAllLocalData() {
  const db = await getDb();
  await resetAllData(db);
}

export async function enableDemoMode() {
  await setDemoModeStorage(true);
  const db = await getDb();
  await seedDemoData(db);
}

export async function disableDemoMode() {
  await setDemoModeStorage(false);
  await getDb();
}
