import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { renderHook } from "@testing-library/react-native";
import {
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";

import { useTabSwipeGesture } from "./useTabSwipeGesture";
import * as globalSwipeGuard from "../utils/globalSwipeGuard";
import * as obligationsSegmentGuard from "../utils/obligationsSegmentGuard";
import type { RootStackParamList } from "../navigation/types";

jest.mock("../utils/globalSwipeGuard");
jest.mock("../utils/obligationsSegmentGuard");

type Config = Parameters<typeof PanResponder.create>[0];
const createSpy = jest.spyOn(PanResponder, "create");

function capturedConfig(): Config {
  const call = createSpy.mock.calls.at(-1);
  if (!call) {
    throw new Error("PanResponder.create was not called");
  }
  return call[0];
}

function makeNavRef(
  currentRouteName: string | undefined
): NavigationContainerRefWithCurrent<RootStackParamList> {
  return {
    getCurrentRoute: jest.fn(() => (currentRouteName ? { name: currentRouteName } : undefined)),
    navigate: jest.fn(),
    isReady: () => true,
  } as unknown as NavigationContainerRefWithCurrent<RootStackParamList>;
}

function makeGestureState(
  gestureState: Pick<PanResponderGestureState, "dx" | "dy" | "vx">
): PanResponderGestureState {
  return {
    stateID: 0,
    _accountsForMovesUpTo: 0,
    moveX: 0,
    moveY: 0,
    x0: 0,
    y0: 0,
    dx: gestureState.dx,
    dy: gestureState.dy,
    vx: gestureState.vx,
    vy: 0,
    numberActiveTouches: 1,
  };
}

describe("useTabSwipeGesture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalSwipeGuard.isGlobalSwipeLocked as jest.Mock).mockReturnValue(false);
    (obligationsSegmentGuard.isObligationsSegmentSwipe as jest.Mock).mockReturnValue(false);
  });

  it("does not capture when global swipe is locked", () => {
    (globalSwipeGuard.isGlobalSwipeLocked as jest.Mock).mockReturnValue(true);
    const navigationRef = makeNavRef("Dashboard");

    renderHook(() => useTabSwipeGesture({ navigationRef }));

    const result = capturedConfig().onMoveShouldSetPanResponder!(
      {} as GestureResponderEvent,
      makeGestureState({ dx: 200, dy: 0, vx: 1 })
    );

    expect(result).toBe(false);
  });

  it("does not capture on non-swipe routes", () => {
    const navigationRef = makeNavRef("Settings");

    renderHook(() => useTabSwipeGesture({ navigationRef }));

    const result = capturedConfig().onMoveShouldSetPanResponder!(
      {} as GestureResponderEvent,
      makeGestureState({ dx: 200, dy: 0, vx: 1 })
    );

    expect(result).toBe(false);
  });

  it("does not capture Obligations segment swipes", () => {
    (obligationsSegmentGuard.isObligationsSegmentSwipe as jest.Mock).mockReturnValue(true);
    const navigationRef = makeNavRef("Obligations");

    renderHook(() => useTabSwipeGesture({ navigationRef }));

    const result = capturedConfig().onMoveShouldSetPanResponder!(
      {} as GestureResponderEvent,
      makeGestureState({ dx: 200, dy: 0, vx: 1 })
    );

    expect(result).toBe(false);
  });

  it("navigates to the next tab on a valid commit", () => {
    const navigationRef = makeNavRef("Dashboard");

    renderHook(() => useTabSwipeGesture({ navigationRef }));

    capturedConfig().onPanResponderRelease!(
      {} as GestureResponderEvent,
      makeGestureState({ dx: -200, dy: 0, vx: -2 })
    );

    expect(navigationRef.navigate).toHaveBeenCalledWith("MainTabs", {
      screen: "Expenses",
    });
  });
});
