import React from "react";
import { KeyboardAvoidingView, Platform, Text } from "react-native";
import { render } from "@testing-library/react-native";

jest.mock("../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      border: "#d0d0d0",
      surface: "#ffffff",
      surfaceSection: "#f5f5f5",
    },
  }),
}));

jest.mock("./Themed", () => ({
  Card: require("react-native").View,
}));

jest.mock("react-native-reanimated", () => {
  const ReactNative = require("react-native");
  const createAnimatedComponent = (Component: unknown) => Component;

  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      createAnimatedComponent,
    },
    createAnimatedComponent,
    SlideInDown: {
      springify: () => ({
        duration: () => ({}),
      }),
    },
  };
});

import { ModalCard } from "./ModalCard";

describe("ModalCard", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
  });

  it("does not use keyboard height avoidance for non-scrollable Android modals", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });

    const { UNSAFE_queryByType } = render(
      <ModalCard visible={true} onRequestClose={() => {}} useCard={false}>
        <Text>Modal content</Text>
      </ModalCard>
    );

    expect(UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
  });

  it("uses padding keyboard avoidance for non-scrollable iOS modals", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });

    const { UNSAFE_getByType } = render(
      <ModalCard visible={true} onRequestClose={() => {}} useCard={false}>
        <Text>Modal content</Text>
      </ModalCard>
    );

    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
  });
});
