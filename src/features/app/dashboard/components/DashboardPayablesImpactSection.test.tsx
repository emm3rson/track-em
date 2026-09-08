import React from "react";
import { render } from "@testing-library/react-native";

import { DashboardPayablesImpactSection } from "./DashboardPayablesImpactSection";
import type { DashboardPayablesImpact } from "../types";

jest.mock("../../../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: require("../../../../theme/colors").getThemeColors("light", "green"),
  }),
}));

jest.mock("../../../../styles/shadows", () => ({
  getActionShadowStyle: () => ({}),
  getFieldShadowStyle: () => ({}),
  getSecondaryActionShadowStyle: () => ({}),
}));

const baseImpact: DashboardPayablesImpact = {
  currentMonth: { credits: 100, net: 900 },
  threeMonthOutlook: { credits: 250, net: 750 },
  allTime: { credits: 400, net: 600 },
  trend: {
    startMonth: "2026-03-01",
    endMonth: "2026-05-01",
    points: [
      { month: "2026-03-01", unpaid: 100, net: 900 },
      { month: "2026-04-01", unpaid: 200, net: 800 },
      { month: "2026-05-01", unpaid: 300, net: 700 },
    ],
  },
};

describe("DashboardPayablesImpactSection", () => {
  it("renders legacy summary view", () => {
    const { getByText, queryByText } = render(
      <DashboardPayablesImpactSection payablesImpact={baseImpact} totalFunds={1000} focusKey={1} />
    );

    expect(getByText("This Month")).toBeTruthy();
    expect(getByText("3-Month Outlook")).toBeTruthy();
    expect(getByText("All-time")).toBeTruthy();
    expect(queryByText("Projected Unpaid")).toBeNull();
  });
});
