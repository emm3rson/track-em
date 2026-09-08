import { Plus } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

type CenterFabButtonProps = {
  onPress: () => void;
};

export function CenterFabButton({ onPress }: CenterFabButtonProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open quick entry actions"
        onPress={onPress}
        style={({ pressed }) => ({
          ...styles.button,
          backgroundColor: colors.primaryBg,
          opacity: pressed ? 0.85 : 1,
          boxShadow: `0px 2px 6px rgba(0, 0, 0, 0.08)`,
        })}
      >
        <Plus size={26} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    marginTop: -18,
    zIndex: 10,
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
});
