import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";

import {
  disableDemoMode,
  enableDemoMode,
  exportBackupPayload,
  resetAllLocalData,
  restoreBackup,
  validateBackupFile,
} from "../service";
import { useDemoMode } from "../../../hooks/useDemoMode";
import { logger } from "../../../utils/logger";

type SettingsNavigation = NavigationProp<Record<string, object | undefined>>;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useSettingsScreenController() {
  const navigation = useNavigation<SettingsNavigation>();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const demoMode = useDemoMode();
  const [switchingDemoMode, setSwitchingDemoMode] = useState(false);

  const navigateToDashboard = useCallback(() => {
    const routeNames = navigation.getState().routeNames ?? [];
    if (routeNames.includes("MainTabs")) {
      navigation.navigate("MainTabs", { screen: "Dashboard" });
      return;
    }
    navigation.navigate("Dashboard");
  }, [navigation]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const payload = await exportBackupPayload();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const now = new Date();
      const fileName = `trackem-backup-${formatDate(now)}`;
      const SAF =
        "StorageAccessFramework" in FileSystem ? FileSystem.StorageAccessFramework : undefined;
      if (!SAF) {
        throw new Error("Android file access is unavailable on this device.");
      }
      const initialUri = SAF.getUriForDirectoryInRoot?.("Download");
      const permissions = await SAF.requestDirectoryPermissionsAsync(initialUri);
      if (!permissions.granted || !permissions.directoryUri) {
        Alert.alert("Permission needed", "Please allow folder access to save the backup.");
        return;
      }
      let fileUri: string;
      try {
        fileUri = await SAF.createFileAsync(permissions.directoryUri, fileName, "application/json");
      } catch {
        fileUri = await SAF.createFileAsync(
          permissions.directoryUri,
          `${fileName}-${Date.now()}`,
          "application/json"
        );
      }
      await SAF.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      Alert.alert("Backup saved", "Your backup was saved to the selected folder.");
    } catch (error) {
      logger.error("settings", "Export backup failed", error);
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "Unable to export backup."
      );
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const performImport = useCallback(async () => {
    if (importing) return;
    try {
      setImporting(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      const contents = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let payload;
      try {
        payload = validateBackupFile(contents);
      } catch (parseError) {
        throw new Error(parseError instanceof Error ? parseError.message : "Invalid backup file.");
      }

      await restoreBackup(payload);

      const summary = `${file.name ?? "Backup"} imported ${new Date().toLocaleString()}`;
      setLastImportSummary(summary);

      Alert.alert("Import complete", "Your data was restored from the backup.");
      navigateToDashboard();
    } catch (error) {
      logger.error("settings", "Import backup failed", error);
      Alert.alert(
        "Import failed",
        error instanceof Error ? error.message : "Unable to import backup."
      );
    } finally {
      setImporting(false);
    }
  }, [importing, navigateToDashboard]);

  const confirmAndImport = useCallback(() => {
    Alert.alert(
      "Import backup?",
      "Importing replaces all current local data with the contents of the backup file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: () => {
            void performImport();
          },
        },
      ]
    );
  }, [performImport]);

  const performResetAllData = useCallback(async () => {
    try {
      setResetting(true);
      await resetAllLocalData();
      Alert.alert("Data cleared", "All local records were deleted. You can now start fresh.");
      navigateToDashboard();
    } catch (error) {
      logger.error("settings", "Reset all data failed", error);
      Alert.alert("Reset failed", error instanceof Error ? error.message : "Unable to reset data.");
    } finally {
      setResetting(false);
    }
  }, [navigateToDashboard]);

  const confirmResetAllData = useCallback(() => {
    if (resetting) return;
    Alert.alert(
      "Reset all data?",
      "This deletes everything stored on this device. You cannot undo this action.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void performResetAllData() },
      ]
    );
  }, [performResetAllData, resetting]);

  const activateDemoMode = useCallback(async () => {
    if (switchingDemoMode) return;
    try {
      setSwitchingDemoMode(true);
      await enableDemoMode();
      Alert.alert("Demo mode enabled", "Sample data loaded. Changes stay in demo mode only.");
      navigateToDashboard();
    } catch (error) {
      logger.error("settings", "Enable demo mode failed", error);
      Alert.alert("Demo mode failed", "Unable to enable demo mode. Please try again.");
    } finally {
      setSwitchingDemoMode(false);
    }
  }, [navigateToDashboard, switchingDemoMode]);

  const deactivateDemoMode = useCallback(async () => {
    if (switchingDemoMode) return;
    try {
      setSwitchingDemoMode(true);
      await disableDemoMode();
      Alert.alert("Demo mode disabled", "Your real data is now active.");
      navigateToDashboard();
    } catch (error) {
      logger.error("settings", "Disable demo mode failed", error);
      Alert.alert("Demo mode failed", "Unable to exit demo mode. Please try again.");
    } finally {
      setSwitchingDemoMode(false);
    }
  }, [navigateToDashboard, switchingDemoMode]);

  const confirmEnterDemoMode = useCallback(() => {
    Alert.alert(
      "Enter Demo Mode?",
      "Demo Mode loads sample data in an isolated database so your real data stays untouched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export Backup",
          onPress: () => {
            void handleExport();
          },
        },
        {
          text: "Enter Demo Mode",
          onPress: () => {
            void activateDemoMode();
          },
        },
      ]
    );
  }, [activateDemoMode, handleExport]);

  const confirmExitDemoMode = useCallback(() => {
    Alert.alert("Exit Demo Mode?", "This will return you to your real data.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit Demo Mode",
        onPress: () => {
          void deactivateDemoMode();
        },
      },
    ]);
  }, [deactivateDemoMode]);

  return {
    exporting,
    importing,
    lastImportSummary,
    resetting,
    demoMode,
    switchingDemoMode,
    handleExport,
    confirmAndImport,
    confirmResetAllData,
    confirmEnterDemoMode,
    confirmExitDemoMode,
  };
}
