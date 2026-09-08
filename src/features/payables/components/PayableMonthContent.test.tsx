import React from "react";
import { render } from "@testing-library/react-native";
import { PayableMonthContent } from "./PayableMonthContent";
import type { CreditRow } from "../types";

jest.mock("../../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: require("../../../theme/colors").getThemeColors("light", "green"),
  }),
}));

jest.mock("../../../styles/shadows", () => ({
  getActionShadowStyle: () => ({}),
  getFieldShadowStyle: () => ({}),
  getSecondaryActionShadowStyle: () => ({}),
}));

describe("PayableMonthContent", () => {
  it("renders partial status and remaining totals distinctly", () => {
    const platformMap = new Map<string, CreditRow>([
      [
        "Electric Co",
        {
          id: 1,
          platform: "Electric Co",
          month: "2026-04-01",
          dueDate: "2026-04-15",
          amount: 100,
          paidAmount: 40,
          remainingAmount: 60,
          paymentCount: 2,
          latestPaidAt: "2026-04-11",
          status: "PARTIALLY_PAID",
          categoryId: 1,
          categoryName: "Bills",
          preferredAccountId: 3,
        },
      ],
      [
        "Water Co",
        {
          id: 2,
          platform: "Water Co",
          month: "2026-04-01",
          dueDate: "2026-04-09",
          amount: 50,
          paidAmount: 50,
          remainingAmount: 0,
          paymentCount: 1,
          latestPaidAt: "2026-04-08",
          status: "PAID",
          categoryId: 1,
          categoryName: "Bills",
          preferredAccountId: null,
        },
      ],
    ]);

    const { getByText } = render(
      <PayableMonthContent
        month="2026-04-01"
        platformMap={platformMap}
        totals={{ paid: 90, remaining: 60 }}
        context="card"
        onOpenEntryActions={jest.fn()}
      />
    );

    expect(getByText("Partially Paid")).toBeTruthy();
    expect(getByText("Monthly Unpaid Total")).toBeTruthy();
    expect(getByText("Monthly Paid Total")).toBeTruthy();
  });
});
