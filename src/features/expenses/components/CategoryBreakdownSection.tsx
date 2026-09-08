import React from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../../components/Themed";
import { SectionCard } from "../../../components/ui/SectionCard";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import { colorForExpenseCategory } from "../chartPalette";
import type { CategoryTotal } from "../types";

type CategoryBreakdownSectionProps = {
  categoryTotals: CategoryTotal[];
  categoryFilterId: number | null;
  onSetCategoryFilter: (categoryId: number | null) => void;
  onOpenManageCategories: () => void;
};

export function CategoryBreakdownSection({
  categoryTotals,
  categoryFilterId,
  onSetCategoryFilter,
  onOpenManageCategories,
}: CategoryBreakdownSectionProps) {
  const { colors } = useTheme();

  return (
    <SectionCard style={{ padding: 12, gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
          Category Breakdown
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage expense categories"
          onPress={onOpenManageCategories}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 0,
            marginRight: 6,
            alignSelf: "flex-end",
          }}
        >
          <Text style={{ color: colors.primaryBg, fontWeight: "600", fontSize: 14 }}>Manage</Text>
        </Pressable>
      </View>
      {categoryTotals.length === 0 ? (
        <Text style={{ color: colors.mutedText }}>
          No expenses this month. Log an expense to see your breakdown.
        </Text>
      ) : (
        <View style={{ gap: 4 }}>
          {categoryTotals.map((categoryTotal) => {
            const selected = categoryFilterId === categoryTotal.categoryId;
            const categoryColor = colorForExpenseCategory(categoryTotal.categoryId, colors);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Focus chart and filter by ${categoryTotal.name}`}
                key={categoryTotal.categoryId}
                onPress={() => onSetCategoryFilter(selected ? null : categoryTotal.categoryId)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: 8,
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                  backgroundColor: selected ? colors.surfaceMuted : "transparent",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                    marginRight: 8,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: categoryColor,
                    }}
                  />
                  <Text
                    style={{ fontWeight: selected ? "700" : "600", color: categoryColor }}
                    numberOfLines={1}
                  >
                    {categoryTotal.name}
                  </Text>
                </View>
                <Text style={{ fontWeight: selected ? "700" : "600", color: colors.text }}>
                  {php.format(categoryTotal.total ?? 0)}
                </Text>
              </Pressable>
            );
          })}
          <Text style={{ color: colors.mutedText, fontSize: 11 }}>
            Tap a category to filter the list and focus the chart.
          </Text>
        </View>
      )}
    </SectionCard>
  );
}
