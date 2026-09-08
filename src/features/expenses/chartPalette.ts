import type { ThemeColors } from "../../theme/colors";
import { semantic } from "../../styles/tokens";

export function getExpenseCategoryPalette(colors: ThemeColors): readonly string[] {
  return [
    colors.primaryBg,
    colors.success,
    colors.badges.unsettled.text,
    colors.danger,
    colors.icon,
    colors.badges.partial.text,
    colors.badges.unpaid.text,
    colors.mutedText,
  ];
}

export function colorForExpenseCategory(categoryId: number, colors?: ThemeColors): string {
  const palette = colors
    ? getExpenseCategoryPalette(colors)
    : semantic.chart.expenseCategoryFallbackPalette;
  return palette[Math.abs(categoryId) % palette.length];
}
