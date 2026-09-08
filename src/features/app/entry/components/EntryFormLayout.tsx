import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { layout, spacing } from "../../../../styles/tokens";

import { AppScreen } from "../../../../ui/components/AppScreen";

type EntryFormLayoutProps = {
  children: React.ReactNode;
};

export function EntryFormLayout({ children }: EntryFormLayoutProps) {
  return (
    <AppScreen stackHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: layout.screenPadding,
    gap: spacing.md,
  },
});
