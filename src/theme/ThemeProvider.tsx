import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import {
  getThemeColors,
  type PrimaryColorKey,
  type ThemeColors,
  type ThemeMode,
  type ThemeScheme,
} from "./colors";

export type FontType = "sans" | "serif";

const SERIF_FONT = "serif";
const SETTINGS_PATH = FileSystem.documentDirectory + "app_settings.json";

type AppSettings = {
  fontType?: FontType;
  primaryColor?: PrimaryColorKey;
};

type ThemeValue = {
  mode: ThemeMode;
  scheme: ThemeScheme;
  colors: ThemeColors;
  toggleScheme: () => void;
  setMode: (mode: ThemeMode) => void;
  fontType: FontType;
  fontFamily: string | undefined;
  setFontType: (type: FontType) => void;
  primaryColor: PrimaryColorKey;
  setPrimaryColor: (color: PrimaryColorKey) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");
  const [overrideScheme, setOverrideScheme] = useState<ThemeScheme | null>(null);
  const [fontType, setFontTypeState] = useState<FontType>("sans");
  const [primaryColor, setPrimaryColorState] = useState<PrimaryColorKey>("green");
  const settingsRef = useRef<AppSettings>({});

  const resolvedSystemScheme: ThemeScheme = systemScheme === "dark" ? "dark" : "light";
  const resolvedScheme: ThemeScheme = useMemo(() => {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    return overrideScheme ?? resolvedSystemScheme;
  }, [mode, overrideScheme, resolvedSystemScheme]);

  const colors = useMemo(
    () => getThemeColors(resolvedScheme, primaryColor),
    [resolvedScheme, primaryColor]
  );
  const fontFamily = fontType === "serif" ? SERIF_FONT : undefined;

  const toggleScheme = useCallback(() => {
    const next = resolvedScheme === "dark" ? "light" : "dark";
    setMode(next);
    setOverrideScheme(null);
  }, [resolvedScheme]);

  const persistSettingsPatch = useCallback((patch: Partial<AppSettings>) => {
    settingsRef.current = { ...settingsRef.current, ...patch };
    FileSystem.writeAsStringAsync(SETTINGS_PATH, JSON.stringify(settingsRef.current)).catch(
      () => {}
    );
  }, []);

  const setFontType = useCallback(
    (type: FontType) => {
      setFontTypeState(type);
      persistSettingsPatch({ fontType: type });
    },
    [persistSettingsPatch]
  );

  const setPrimaryColor = useCallback(
    (color: PrimaryColorKey) => {
      setPrimaryColorState(color);
      persistSettingsPatch({ primaryColor: color });
    },
    [persistSettingsPatch]
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      setOverrideScheme(null);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    FileSystem.readAsStringAsync(SETTINGS_PATH)
      .then((content) => {
        const saved = JSON.parse(content) as AppSettings;
        settingsRef.current = typeof saved === "object" && saved != null ? saved : {};
        if (saved.fontType === "sans" || saved.fontType === "serif") {
          setFontTypeState(saved.fontType);
        }
        if (
          saved.primaryColor === "green" ||
          saved.primaryColor === "blue" ||
          saved.primaryColor === "orange"
        ) {
          setPrimaryColorState(saved.primaryColor);
        }
      })
      .catch(() => {
        settingsRef.current = {};
      });
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      scheme: resolvedScheme,
      colors,
      toggleScheme,
      setMode: (nextMode) => {
        setMode(nextMode);
        if (nextMode !== "system") {
          setOverrideScheme(null);
        }
      },
      fontType,
      fontFamily,
      setFontType,
      primaryColor,
      setPrimaryColor,
    }),
    [
      mode,
      resolvedScheme,
      colors,
      toggleScheme,
      fontType,
      fontFamily,
      setFontType,
      primaryColor,
      setPrimaryColor,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
