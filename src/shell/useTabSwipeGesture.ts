import { useMemo, useRef } from "react";
import { PanResponder, TextInput, type PanResponderInstance } from "react-native";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { isGlobalSwipeLocked } from "../utils/globalSwipeGuard";
import { isObligationsSegmentSwipe } from "../utils/obligationsSegmentGuard";
import {
  BALANCED_SWIPE_CONFIG,
  shouldCaptureHorizontalSwipe,
  shouldCommitHorizontalSwipe,
} from "../utils/swipeGestures";
import type { RootStackParamList, TabParamList } from "../navigation/types";

const SWIPE_TABS: (keyof TabParamList)[] = ["Dashboard", "Expenses", "Accounts", "Obligations"];

type UseTabSwipeGestureArgs = {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

type UseTabSwipeGestureResult = {
  panHandlers: PanResponderInstance["panHandlers"];
};

export function useTabSwipeGesture({
  navigationRef,
}: UseTabSwipeGestureArgs): UseTabSwipeGestureResult {
  const swipeCooldownUntilRef = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (Date.now() < swipeCooldownUntilRef.current) {
            return false;
          }

          if (isGlobalSwipeLocked()) {
            return false;
          }

          const activeInput = TextInput.State?.currentlyFocusedInput?.();
          if (activeInput) {
            return false;
          }

          const currentRoute = navigationRef.getCurrentRoute()?.name;
          if (!currentRoute || !SWIPE_TABS.includes(currentRoute as keyof TabParamList)) {
            return false;
          }

          if (currentRoute === "Obligations" && isObligationsSegmentSwipe(gestureState.dx)) {
            return false;
          }

          return shouldCaptureHorizontalSwipe(gestureState, BALANCED_SWIPE_CONFIG);
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (Date.now() < swipeCooldownUntilRef.current) {
            return;
          }

          if (isGlobalSwipeLocked()) {
            return;
          }

          if (!shouldCommitHorizontalSwipe(gestureState, BALANCED_SWIPE_CONFIG)) {
            return;
          }

          const currentRoute = navigationRef.getCurrentRoute()?.name as
            | keyof TabParamList
            | undefined;
          if (!currentRoute) {
            return;
          }

          const currentIndex = SWIPE_TABS.indexOf(currentRoute);
          if (currentIndex === -1) {
            return;
          }

          if (currentRoute === "Obligations" && isObligationsSegmentSwipe(gestureState.dx)) {
            return;
          }

          const nextIndex =
            gestureState.dx > 0
              ? (currentIndex - 1 + SWIPE_TABS.length) % SWIPE_TABS.length
              : (currentIndex + 1) % SWIPE_TABS.length;

          const nextRoute = SWIPE_TABS[nextIndex];
          if (!nextRoute || nextRoute === currentRoute) {
            return;
          }

          swipeCooldownUntilRef.current = Date.now() + BALANCED_SWIPE_CONFIG.cooldownMs;
          navigationRef.navigate("MainTabs", { screen: nextRoute });
        },
      }),
    [navigationRef]
  );

  return { panHandlers: panResponder.panHandlers };
}
