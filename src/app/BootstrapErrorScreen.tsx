import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getThemeColors } from "../theme/colors";

const bootstrapColors = getThemeColors("light", "blue");

type Props = {
  onRetry: () => void;
};

export function BootstrapErrorScreen({ onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unable to start</Text>
      <Text style={styles.body}>
        The app could not initialize its database. This may be a temporary issue.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.buttonLabel}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: bootstrapColors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: bootstrapColors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: bootstrapColors.mutedText,
    marginBottom: 32,
  },
  button: {
    backgroundColor: bootstrapColors.primaryBg,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 10,
  },
  buttonLabel: {
    color: bootstrapColors.primaryText,
    fontWeight: "700",
    fontSize: 16,
  },
});
