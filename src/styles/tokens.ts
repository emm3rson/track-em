export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

export const typography = {
  title: 22,
  sectionTitle: 18,
  body: 14,
  caption: 12,
} as const;

export const motion = {
  fast: 140,
  normal: 220,
  slow: 320,
} as const;

export const opacities = {
  loading: 0.7,
  disabled: 0.45,
} as const;

export const components = {
  modalGap: spacing.md,
  modalScrollableMaxHeight: "85%",
  badgeFontSize: 12,
  badgePaddingVertical: 3,
  badgePaddingHorizontal: 10,
  statusBadgeRadius: radius.pill,
  payableRowPaddingVertical: 9,
  payableStatusFontSize: 13,
  receivablePaymentSummaryGap: 6,
  sectionCardPadding: 14,
  sectionCardGap: 10,
  sectionTitleFontSize: 18,
  formLabelFontSize: typography.body,
  formActionRowGap: spacing.sm,
  formActionPadding: spacing.md,
  inlinePillPaddingVertical: 10,
  inlinePillPaddingHorizontal: 12,
  inlinePillCompactPaddingVertical: 6,
  inlinePillCompactPaddingHorizontal: 10,
  inputPadding: spacing.md,
  bottomSheetTopRadius: 20,
  bottomSheetHandleWidth: 44,
  bottomSheetHandleHeight: 4,
  bottomSheetActionRowMinHeight: 48,
  bottomSheetTitleFontSize: 16,
  bottomSheetSubtitleFontSize: typography.caption,
  bottomSheetActionFontSize: typography.body,
  bottomSheetPaddingTop: spacing.xxs,
  bottomSheetHeaderBlockPaddingVertical: spacing.xxs,
  bottomSheetSheetGap: 4,
  bottomSheetActionGroupMarginTop: spacing.xxs,
  bottomSheetPaddingBottomMin: spacing.xxs,
  bottomSheetGesture: {
    activationDistance: 4,
    dismissDistanceRatio: 0.18,
    minDismissDistance: 56,
    minDismissVelocity: 700,
    maxUpwardTranslation: 0,
    springDamping: 22,
    springStiffness: 280,
  },
} as const;

export const effects = {
  cardShadow: "0px 1px 1px rgba(145, 145, 145, 0.25)",
} as const;

export const layout = {
  screenPadding: spacing.lg,
  screenGap: spacing.lg,
  sectionGap: spacing.md,
  modalPaddingHorizontal: spacing.lg,
  modalPaddingVertical: spacing.xl,
} as const;

export const semantic = {
  overlay: {
    scrim: "rgba(0,0,0,0.5)",
  },
  shadow: {
    base: "#000000",
  },
  chart: {
    expenseCategorySlots: 8,
    expenseCategoryFallbackPalette: [
      "#3B82F6",
      "#1DAA70",
      "#F59E0B",
      "#EF4444",
      "#0EA5E9",
      "#84CC16",
      "#F97316",
      "#14B8A6",
    ],
  },
  institutionLogo: {
    imageOpacity: 1,
  },
} as const;
