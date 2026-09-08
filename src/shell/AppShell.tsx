import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme/ThemeProvider";

type AppShellProps = {
  children: React.ReactNode;
  zeroTopInset?: boolean;
};

// Shell contract: owns the themed background and can zero the `top` inset
// inside its subtree when a shell-level banner already consumed that space.
export function AppShell({ children, zeroTopInset = false }: AppShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaInsetsContext.Provider value={zeroTopInset ? { ...insets, top: 0 } : insets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
