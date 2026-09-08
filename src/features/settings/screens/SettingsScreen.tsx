import React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import {
  PRIMARY_COLOR_HEX,
  PRIMARY_COLOR_LABELS,
  type PrimaryColorKey,
} from "../../../theme/colors";
import { getAppVersionLabel } from "../../../config/appVersion";
import { getActionShadowStyle, getFieldShadowStyle } from "../../../styles/shadows";
import { Text } from "../../../components/Themed";
import { AppScreen } from "../../../ui/components/AppScreen";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { SectionCard } from "../../../components/ui/SectionCard";
import {
  Check,
  FolderDown,
  FolderUp,
  FolderX,
  MoonStar,
  Palette,
  Sprout,
  Type,
} from "lucide-react-native";
import { useSettingsScreenController } from "../hooks/useSettingsScreenController";
import { opacities, radius } from "../../../styles/tokens";

const PRIMARY_COLOR_OPTIONS: PrimaryColorKey[] = ["green", "blue", "orange"];

type SurfaceButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
};

function SurfaceButton({
  onPress,
  disabled,
  loading,
  accessibilityLabel,
  children,
}: SurfaceButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.surfaceButton,
        getActionShadowStyle(colors),
        { backgroundColor: colors.surfaceAlt },
        (loading || disabled) && { opacity: opacities.loading },
      ]}
    >
      {children}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, scheme, toggleScheme, fontType, setFontType, primaryColor, setPrimaryColor } =
    useTheme();
  const actionShadowStyle = getActionShadowStyle(colors);

  const {
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
  } = useSettingsScreenController();

  const appVersion = getAppVersionLabel();
  const exportLabel = exporting ? "Creating backup..." : "Export Backup";
  const importLabel = "Import Backup";
  const demoLabel = demoMode ? "Exit Demo Mode" : "Enter Demo Mode";
  const resetLabel = resetting ? "Resetting..." : "Reset all data";
  const demoActionColor = demoMode ? colors.text : colors.primaryText;

  return (
    <AppScreen
      stackHeader={true}
      header={
        <Text style={[styles.versionText, { color: colors.mutedText }]}>Version {appVersion}</Text>
      }
      contentContainerStyle={styles.screenContent}
    >
      <SectionCard style={styles.appearanceCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.appearanceRows}>
          <View style={styles.appearanceRow}>
            <View style={styles.rowLabelWithIcon}>
              <MoonStar size={14} color={colors.icon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <View style={getFieldShadowStyle(colors)}>
              <Switch
                value={scheme === "dark"}
                onValueChange={toggleScheme}
                trackColor={{ false: colors.border, true: colors.primaryBg }}
                thumbColor={colors.primaryBg}
              />
            </View>
          </View>
          <View style={styles.appearanceRow}>
            <View style={styles.rowLabelWithIcon}>
              <Type size={14} color={colors.icon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Font Style</Text>
            </View>
            <View
              style={[
                styles.fontToggleGroup,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Pressable
                onPress={() => setFontType("sans")}
                style={[
                  styles.fontToggleOption,
                  fontType === "sans"
                    ? { backgroundColor: colors.primaryBg }
                    : styles.transparentBackground,
                ]}
              >
                <Text
                  style={[
                    styles.fontSample,
                    { color: fontType === "sans" ? colors.primaryText : colors.text },
                  ]}
                >
                  Aa
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFontType("serif")}
                style={[
                  styles.fontToggleOption,
                  fontType === "serif"
                    ? { backgroundColor: colors.primaryBg }
                    : styles.transparentBackground,
                ]}
              >
                <Text
                  style={[
                    styles.fontSample,
                    {
                      color: fontType === "serif" ? colors.primaryText : colors.text,
                      fontFamily: "serif",
                    },
                  ]}
                >
                  Aa
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.appearanceRow}>
            <View style={styles.rowLabelWithIcon}>
              <Palette size={14} color={colors.icon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Primary Color</Text>
            </View>
            <View style={styles.primaryColorRow}>
              {PRIMARY_COLOR_OPTIONS.map((colorKey) => {
                const selected = primaryColor === colorKey;
                const swatch = PRIMARY_COLOR_HEX[colorKey];
                return (
                  <Pressable
                    key={colorKey}
                    onPress={() => setPrimaryColor(colorKey)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set primary color to ${PRIMARY_COLOR_LABELS[colorKey]}`}
                    style={[
                      styles.primaryColorSwatch,
                      {
                        backgroundColor: swatch,
                        borderColor: selected ? colors.primaryBg : colors.border,
                      },
                    ]}
                  >
                    {selected ? <Check size={14} color={colors.primaryText} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard style={styles.backupCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup & Restore</Text>
        <Text style={[styles.bodyText, { color: colors.mutedText }]}>
          Your data lives only on this device; nothing is sent online. Export a backup file to
          restore later or move to a new device.
        </Text>

        <SurfaceButton
          onPress={handleExport}
          disabled={exporting}
          loading={exporting}
          accessibilityLabel={exportLabel}
        >
          <View style={styles.buttonContentRow}>
            <FolderUp size={16} color={colors.text} />
            <Text style={[styles.buttonLabelText, { color: colors.text }]}>{exportLabel}</Text>
          </View>
        </SurfaceButton>
        <PrimaryButton onPress={confirmAndImport} disabled={importing} loading={importing}>
          <View style={styles.buttonContentRow}>
            <FolderDown size={16} color={colors.primaryText} />
            <Text style={[styles.buttonLabelText, { color: colors.primaryText }]}>
              {importLabel}
            </Text>
          </View>
        </PrimaryButton>
        {lastImportSummary ? (
          <Text style={[styles.caption, { color: colors.mutedText }]}>{lastImportSummary}</Text>
        ) : null}
      </SectionCard>

      <SectionCard style={styles.demoCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Demo Mode</Text>
        <Text style={[styles.bodyText, { color: colors.mutedText }]}>
          Explore the app with sample data without touching your real records.
        </Text>
        {demoMode ? (
          <SurfaceButton
            onPress={confirmExitDemoMode}
            disabled={switchingDemoMode}
            loading={switchingDemoMode}
          >
            <View style={styles.buttonContentRow}>
              <Sprout size={16} color={demoActionColor} />
              <Text style={[styles.buttonLabelText, { color: demoActionColor }]}>{demoLabel}</Text>
            </View>
          </SurfaceButton>
        ) : (
          <PrimaryButton
            onPress={confirmEnterDemoMode}
            disabled={switchingDemoMode}
            loading={switchingDemoMode}
          >
            <View style={styles.buttonContentRow}>
              <Sprout size={16} color={demoActionColor} />
              <Text style={[styles.buttonLabelText, { color: demoActionColor }]}>{demoLabel}</Text>
            </View>
          </PrimaryButton>
        )}
      </SectionCard>

      <SectionCard style={styles.dangerCard}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger Zone</Text>
        <Text style={[styles.bodyText, { color: colors.mutedText }]}>
          Remove every record stored on this device and return TrackEm to a blank slate.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resetting ? "Resetting data" : "Reset all data"}
          onPress={confirmResetAllData}
          disabled={resetting}
          style={[
            styles.dangerButton,
            actionShadowStyle,
            {
              backgroundColor: colors.surfaceAlt,
              opacity: resetting ? 0.6 : 1,
            },
          ]}
        >
          <View style={styles.buttonContentRow}>
            <FolderX size={16} color={colors.danger} />
            <Text style={[styles.dangerButtonText, { color: colors.danger }]}>{resetLabel}</Text>
          </View>
        </Pressable>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  versionText: {
    fontSize: 12,
  },
  screenContent: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  appearanceRows: {
    gap: 10,
  },
  appearanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 38,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowLabelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appearanceCard: {
    padding: 16,
    gap: 12,
  },
  backupCard: {
    padding: 16,
    gap: 14,
  },
  demoCard: {
    padding: 16,
    gap: 12,
  },
  dangerCard: {
    padding: 16,
    gap: 12,
  },
  fontToggleGroup: {
    flexDirection: "row",
    gap: 6,
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  fontToggleOption: {
    minWidth: 58,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  fontSample: {
    fontSize: 13,
    fontWeight: "600",
  },
  transparentBackground: {
    backgroundColor: "transparent",
  },
  primaryColorRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryColorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  caption: {
    fontSize: 12,
  },
  bodyText: {
    fontSize: 14,
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonLabelText: {
    fontWeight: "700",
  },
  surfaceButton: {
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButton: {
    borderWidth: 0,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    fontWeight: "800",
  },
});
