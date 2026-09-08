import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";

import { Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing, typography } from "../../../../styles/tokens";
import type { ExpenseCategory } from "../../types";

const ROW_HEIGHT = 48;
const ROW_HORIZONTAL_PADDING = spacing.md;

type Props = {
  category: ExpenseCategory;
  isProtected: boolean;
  onPress: (category: ExpenseCategory) => void;
};

export function CategoryListRow({ category, isProtected, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.categoryRow,
        pressed && !isProtected && { backgroundColor: colors.surface },
      ]}
      onPress={isProtected ? undefined : () => onPress(category)}
    >
      <Text
        style={[styles.categoryNameText, { color: colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {category.name}
      </Text>
      {isProtected && <Lock size={16} color={colors.mutedText} />}
    </Pressable>
  );
}

export function CategoryListSeparator() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.rowDivider,
        { marginHorizontal: ROW_HORIZONTAL_PADDING, backgroundColor: colors.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    height: ROW_HEIGHT,
    paddingHorizontal: ROW_HORIZONTAL_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryNameText: {
    fontWeight: "600",
    fontSize: typography.body,
    flex: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
