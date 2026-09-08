import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("../theme/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: "#101010",
    },
  })),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");

  return {
    SafeAreaInsetsContext: React.createContext(null),
    useSafeAreaInsets: jest.fn(() => ({
      top: 24,
      right: 8,
      bottom: 12,
      left: 8,
    })),
  };
});

import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("preserves the top inset for descendants by default", () => {
    const { toJSON, getByText } = render(
      <AppShell>
        <SafeAreaInsetsContext.Consumer>
          {(insets) => <Text>{`top:${insets?.top ?? "missing"}`}</Text>}
        </SafeAreaInsetsContext.Consumer>
        <Text>child</Text>
      </AppShell>
    );

    expect(getByText("child")).toBeTruthy();
    expect(getByText("top:24")).toBeTruthy();
    const tree1 = toJSON() as unknown as { props: { style: unknown } };
    expect(tree1).not.toBeNull();
    expect(tree1.props.style).toEqual([
      expect.objectContaining({
        flex: 1,
      }),
      expect.objectContaining({
        backgroundColor: "#101010",
      }),
    ]);
  });

  it("zeroes the top inset for descendants when requested by the shell", () => {
    const { toJSON, getByText } = render(
      <AppShell zeroTopInset={true}>
        <SafeAreaInsetsContext.Consumer>
          {(insets) => <Text>{`top:${insets?.top ?? "missing"}`}</Text>}
        </SafeAreaInsetsContext.Consumer>
        <Text>child</Text>
      </AppShell>
    );

    expect(getByText("child")).toBeTruthy();
    expect(getByText("top:0")).toBeTruthy();
    const tree2 = toJSON() as unknown as { props: { style: unknown } };
    expect(tree2).not.toBeNull();
    expect(tree2.props.style).toEqual([
      expect.objectContaining({
        flex: 1,
      }),
      expect.objectContaining({
        backgroundColor: "#101010",
      }),
    ]);
  });
});
