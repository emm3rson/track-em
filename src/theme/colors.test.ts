import { getThemeColors, type PrimaryColorKey, type ThemeScheme } from "./colors";

describe("getThemeColors", () => {
  const schemes: ThemeScheme[] = ["light", "dark"];
  const primaryColors: PrimaryColorKey[] = ["green", "blue", "orange"];

  it.each(schemes)("returns complete palette for %s scheme", (scheme) => {
    for (const primary of primaryColors) {
      const colors = getThemeColors(scheme, primary);

      expect(colors.background).toBeTruthy();
      expect(colors.surface).toBeTruthy();
      expect(colors.text).toBeTruthy();
      expect(colors.primaryBg).toBeTruthy();
      expect(colors.primaryText).toBeTruthy();
      expect(colors.badges.settled.background).toBeTruthy();
      expect(colors.badges.unpaid.text).toBeTruthy();
    }
  });

  it("generates muted icon color in rgba format", () => {
    const colors = getThemeColors("light", "green");
    expect(colors.iconMuted.startsWith("rgba(")).toBe(true);
  });
});
