import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../components/Themed";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { radius, semantic, spacing } from "../styles/tokens";

type Props = {
  visible: boolean;
  onUpdate: () => Promise<void>;
  onDismiss: () => void;
  message?: string;
};

export function UpdatePromptModal({ visible, onUpdate, onDismiss, message }: Props) {
  const { colors, fontFamily } = useTheme();
  const [applying, setApplying] = useState(false);

  async function handleUpdate() {
    setApplying(true);
    await onUpdate();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { fontFamily }]}>Update Available</Text>
          <Text style={[styles.body, { color: colors.mutedText, fontFamily }]}>
            A new version of the app is ready. Tap "Update Now" to apply it right away, no restart
            needed.
          </Text>
          {message ? (
            <Text style={[styles.body, { color: colors.mutedText, fontFamily }]}>{message}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              onPress={onDismiss}
              disabled={applying}
              style={({ pressed }) => [styles.laterButton, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.laterLabel, { color: colors.mutedText, fontFamily }]}>
                Later
              </Text>
            </Pressable>
            <PrimaryButton
              onPress={handleUpdate}
              loading={applying}
              borderRadius={radius.md}
              style={styles.updateButton}
            >
              {applying ? "Applying..." : "Update Now"}
            </PrimaryButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: semantic.overlay.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    boxShadow: `0px 4px 12px rgba(0, 0, 0, 0.08)`,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  laterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  laterLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  updateButton: {
    paddingHorizontal: spacing.lg,
  },
});
