import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ActionBottomSheet } from "./ActionBottomSheet";
import type { ActionBottomSheetAction } from "./ActionBottomSheet";

// --- module mocks -----------------------------------------------------------

jest.mock("react-native-reanimated", () => {
  const ReactNative = require("react-native");
  const createAnimatedComponent = (C: unknown) => C;
  return {
    __esModule: true,
    default: { View: ReactNative.View, createAnimatedComponent },
    createAnimatedComponent,
    useSharedValue: <T,>(v: T) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: <T,>(v: T) => v,
    withSpring: <T,>(v: T) => v,
    runOnJS: (fn: (...a: unknown[]) => unknown) => fn,
    interpolate: () => 0,
    Extrapolation: { CLAMP: "clamp" },
    Easing: { bezier: () => () => 0, linear: () => 0 },
  };
});

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  const chain: Record<string, unknown> = {};
  ["enabled", "minDistance", "onBegin", "onUpdate", "onEnd", "onFinalize"].forEach((k) => {
    chain[k] = () => chain;
  });
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: View,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: require("../../theme/colors").getThemeColors("light", "green"),
  }),
}));

jest.mock("../Themed", () => {
  const { View, Text } = require("react-native");
  return { Card: View, Text };
});

// ---------------------------------------------------------------------------

const defaultActions: ActionBottomSheetAction[] = [
  { key: "edit", label: "Edit", onPress: jest.fn() },
  { key: "delete", label: "Delete", tone: "danger", onPress: jest.fn() },
];

function sheet(overrides?: Partial<React.ComponentProps<typeof ActionBottomSheet>>) {
  return {
    visible: true,
    title: "Test Sheet",
    actions: defaultActions,
    onClose: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe("ActionBottomSheet — default variant", () => {
  it("renders title, subtitle, and action labels", () => {
    const { getByText } = render(<ActionBottomSheet {...sheet({ subtitle: "Pick an action" })} />);

    expect(getByText("Test Sheet")).toBeTruthy();
    expect(getByText("Pick an action")).toBeTruthy();
    expect(getByText("Edit")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();
  });
});

describe("ActionBottomSheet — grid-flat variant", () => {
  it("renders action labels and pressing one calls onPress", () => {
    const onPress = jest.fn();
    const actions: ActionBottomSheetAction[] = [
      { key: "expense", label: "Expense", onPress, iconTintColor: "#f00" },
    ];
    const { getByText } = render(
      <ActionBottomSheet {...sheet({ variant: "grid-flat", actions })} />
    );

    expect(getByText("Expense")).toBeTruthy();
    fireEvent.press(getByText("Expense"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("ActionBottomSheet — backdrop", () => {
  it("calls onClose when the backdrop is pressed", () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(<ActionBottomSheet {...sheet({ onClose })} />);

    fireEvent.press(getByLabelText("Close action sheet"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ActionBottomSheet — disabled action", () => {
  it("does not call onPress when action is disabled", () => {
    const onPress = jest.fn();
    const actions: ActionBottomSheetAction[] = [
      { key: "locked", label: "Locked Action", onPress, disabled: true },
    ];
    const { getByLabelText } = render(<ActionBottomSheet {...sheet({ actions })} />);

    // Pressable with disabled=true should not invoke onPress
    fireEvent.press(getByLabelText("Locked Action"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
