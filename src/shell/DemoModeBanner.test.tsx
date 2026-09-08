import React from "react";
import { render } from "@testing-library/react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DemoModeBanner } from "./DemoModeBanner";

jest.mock("../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      primaryBg: "#123456",
      primaryText: "#ffffff",
    },
    fontFamily: "System",
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 24,
    right: 0,
    bottom: 0,
    left: 0,
  })),
}));

describe("DemoModeBanner", () => {
  beforeEach(() => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue({
      top: 24,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it("does not render when hidden", () => {
    const { queryByText } = render(<DemoModeBanner visible={false} />);

    expect(queryByText("Demo Mode Active")).toBeNull();
  });

  it("renders and consumes the top inset itself when visible", () => {
    const { getByText, toJSON } = render(<DemoModeBanner visible={true} />);

    expect(getByText("Demo Mode Active")).toBeTruthy();
    const tree = toJSON() as unknown as { props: { style: unknown } };
    expect(tree).not.toBeNull();
    expect(tree.props.style).toEqual([
      expect.objectContaining({
        paddingBottom: 6,
      }),
      expect.objectContaining({
        paddingTop: 30,
        backgroundColor: "#123456",
      }),
    ]);
  });
});
