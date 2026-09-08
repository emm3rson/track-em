import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";

import { logger } from "../utils/logger";
import { useTheme } from "../theme/ThemeProvider";
import { RootNavigator } from "../navigation/RootNavigator";
import type { RootStackParamList } from "../navigation/types";
import { AppProviders } from "./AppProviders";
import { bootstrap } from "./bootstrap";
import { resetDbCache } from "../data/getDb";
import { AppShell } from "../shell/AppShell";
import { ShellOverlayHost } from "../shell/ShellOverlayHost";
import { useTabSwipeGesture } from "../shell/useTabSwipeGesture";
import { BootstrapErrorScreen } from "./BootstrapErrorScreen";
import { useDemoMode } from "../hooks/useDemoMode";

function AppInner() {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<Error | null>(null);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { scheme, colors } = useTheme();
  const demoMode = useDemoMode();
  const { panHandlers } = useTabSwipeGesture({ navigationRef });
  const navigationTheme = useMemo(
    () => ({
      ...(scheme === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.primaryBg,
      },
    }),
    [scheme, colors]
  );

  const runBootstrap = useCallback(async () => {
    setBootError(null);
    try {
      await bootstrap();
      setReady(true);
    } catch (error) {
      logger.error("app/bootstrap", "App bootstrap failed", error);
      setBootError(error instanceof Error ? error : new Error("Bootstrap failed"));
    }
  }, []);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  const handleBootRetry = useCallback(() => {
    resetDbCache();
    void runBootstrap();
  }, [runBootstrap]);

  if (bootError) {
    return <BootstrapErrorScreen onRetry={handleBootRetry} />;
  }

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <AppShell zeroTopInset={demoMode}>
      <ShellOverlayHost showDemoBanner={demoMode}>
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <View style={styles.root} {...panHandlers}>
            <RootNavigator navigationRef={navigationRef} />
          </View>
        </NavigationContainer>
      </ShellOverlayHost>
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppInner />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
