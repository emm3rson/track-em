export type ThemeMode = "system" | "light" | "dark";

export type ThemeScheme = "light" | "dark";

export type PrimaryColorKey = "green" | "blue" | "orange";

export type ThemeColors = {
  background: string;
  backgroundGradient: {
    start: string;
    end: string;
  };
  surface: string;
  surfaceRaised: string;
  surfaceSection: string;
  surfaceAlt: string;
  surfaceMuted: string;
  border: string;

  text: string;
  mutedText: string;
  placeholderText: string;

  icon: string;
  iconMuted: string;

  primaryBg: string;
  primaryText: string;

  danger: string;
  success: string;

  chartTrack: string;

  badges: {
    settled: { background: string; text: string };
    partial: { background: string; text: string };
    unsettled: { background: string; text: string };
    overdue: { background: string; text: string };
    paid: { background: string; text: string };
    unpaid: { background: string; text: string };
  };
};

type ThemeBaseColors = Omit<ThemeColors, "icon" | "iconMuted" | "primaryBg" | "primaryText">;

type AccentPalette = {
  primaryBg: string;
  iconLight: string;
  iconDark: string;
};

type AccentPairPreset = {
  blue: AccentPalette;
  orange: AccentPalette;
};

const PRIMARY_TEXT = "#F8FAFC";

export const PRIMARY_COLOR_LABELS: Record<PrimaryColorKey, string> = {
  green: "Green",
  blue: "Blue",
  orange: "Orange",
};

export const PRIMARY_COLOR_HEX: Record<PrimaryColorKey, string> = {
  green: "#1DAA70",
  blue: "#4E85B8",
  orange: "#C8743D",
};

const ACCENT_PAIR_PRESETS: Record<"balanced" | "fresh" | "vibrant", AccentPairPreset> = {
  // Balanced: slightly muted, still clear and lively.
  balanced: {
    blue: {
      primaryBg: "#4E85B8",
      iconLight: "#3B6F9D",
      iconDark: "#8CB4D8",
    },
    orange: {
      primaryBg: "#C8743D",
      iconLight: "#A95F2E",
      iconDark: "#E0A477",
    },
  },
  // Fresh: cooler blue + natural orange with a cleaner look.
  fresh: {
    blue: {
      primaryBg: "#4A90C2",
      iconLight: "#3778A7",
      iconDark: "#86BCDF",
    },
    orange: {
      primaryBg: "#CF7A42",
      iconLight: "#B56632",
      iconDark: "#E4AD84",
    },
  },
  // Vibrant: most saturated while still softer than pure brand colors.
  vibrant: {
    blue: {
      primaryBg: "#4B7FD0",
      iconLight: "#3968B3",
      iconDark: "#8FB1E7",
    },
    orange: {
      primaryBg: "#D77833",
      iconLight: "#BC6328",
      iconDark: "#E9AA76",
    },
  },
};

const ACTIVE_ACCENT_PAIR_PRESET: keyof typeof ACCENT_PAIR_PRESETS = "vibrant";
const activeAccentPair = ACCENT_PAIR_PRESETS[ACTIVE_ACCENT_PAIR_PRESET];

const PRIMARY_ACCENTS: Record<PrimaryColorKey, AccentPalette> = {
  green: {
    primaryBg: PRIMARY_COLOR_HEX.green,
    iconLight: "#198F5E",
    iconDark: "#34D399",
  },
  blue: activeAccentPair.blue,
  orange: activeAccentPair.orange,
};

const lightBaseColors: ThemeBaseColors = {
  background: "#EBEBEB",
  backgroundGradient: { start: "#EBEBEB", end: "#EBEBEB" },
  surface: "#F5EFEF",
  surfaceRaised: "#FAF8F8",
  surfaceSection: "#F5EFEF",
  surfaceAlt: "#EBEBEB",
  surfaceMuted: "#E2E2E2",
  border: "#D9D3D3",

  text: "#26282C",
  mutedText: "rgba(38,40,44,0.70)",
  placeholderText: "rgba(38,40,44,0.48)",

  danger: "#EF4444",
  success: "#1DAA70",

  chartTrack: "#D8D8D8",

  badges: {
    settled: { background: "#D2F1E4", text: "#1DAA70" },
    partial: { background: "#DBEAFE", text: "#3B82F6" },
    unsettled: { background: "#FEF3C7", text: "#F59E0B" },
    overdue: { background: "#FEE2E2", text: "#EF4444" },
    paid: { background: "#D2F1E4", text: "#1DAA70" },
    unpaid: { background: "#FFEDD5", text: "#EA580C" },
  },
};

const darkBaseColors: ThemeBaseColors = {
  background: "#000000",
  backgroundGradient: { start: "#000000", end: "#000000" },
  surface: "#121418",
  surfaceRaised: "#1e2028",
  surfaceSection: "#121418",
  surfaceAlt: "#1e2028",
  surfaceMuted: "#1a1e24",
  border: "rgba(255,255,255,0.12)",

  text: "#f2f2f2",
  mutedText: "rgba(255,255,255,0.72)",
  placeholderText: "rgba(255,255,255,0.5)",

  danger: "#EF4444",
  success: "#1DAA70",

  chartTrack: "#2a2a2f",

  badges: {
    settled: { background: "rgba(29,170,112,0.2)", text: "#1DAA70" },
    partial: { background: "rgba(59, 130, 246, 0.2)", text: "#3B82F6" },
    unsettled: { background: "rgba(245, 158, 11, 0.2)", text: "#F59E0B" },
    overdue: { background: "rgba(239, 68, 68, 0.2)", text: "#EF4444" },
    paid: { background: "rgba(29,170,112,0.2)", text: "#1DAA70" },
    unpaid: { background: "rgba(234, 88, 12, 0.2)", text: "#EA580C" },
  },
};

function rgbaFromHex(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => `${ch}${ch}`)
          .join("")
      : clean;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function getThemeColors(scheme: ThemeScheme, primaryColor: PrimaryColorKey): ThemeColors {
  const base = scheme === "dark" ? darkBaseColors : lightBaseColors;
  const accent = PRIMARY_ACCENTS[primaryColor];
  const icon = scheme === "dark" ? accent.iconDark : accent.iconLight;
  const iconMutedAlpha = scheme === "dark" ? 0.52 : 0.45;

  return {
    ...base,
    icon,
    iconMuted: rgbaFromHex(icon, iconMutedAlpha),
    primaryBg: accent.primaryBg,
    primaryText: PRIMARY_TEXT,
  };
}
