import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PanResponder, TextInput } from "react-native";

import { isGlobalSwipeLocked } from "../../../../utils/globalSwipeGuard";
import { setObligationsSegment } from "../../../../utils/obligationsSegmentGuard";
import {
  BALANCED_SWIPE_CONFIG,
  shouldCaptureHorizontalSwipe,
  shouldCommitHorizontalSwipe,
} from "../../../../utils/swipeGestures";

export function useObligationsSegmentController(swipeLocked: boolean) {
  const [segment, setSegment] = useState<"payables" | "receivables">("payables");

  // Keep the module-level guard in sync so AppRoot's global tab-swipe
  // knows when to yield to this segment switcher.
  // useLayoutEffect fires synchronously after render, eliminating the async
  // race window where AppRoot could read a stale _currentSegment value.
  useLayoutEffect(() => {
    setObligationsSegment(segment);
    return () => {
      // Clear when the Obligations screen unmounts.
      setObligationsSegment(null);
    };
  }, [segment]);

  const swipeCooldownUntilRef = useRef(0);

  const canSwipeSegments = useCallback(
    (dx: number) => (segment === "payables" && dx < 0) || (segment === "receivables" && dx > 0),
    [segment]
  );

  const segmentPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (swipeLocked) return false;
          if (Date.now() < swipeCooldownUntilRef.current) return false;
          if (isGlobalSwipeLocked()) return false;

          const activeInput = TextInput.State?.currentlyFocusedInput?.();
          if (activeInput) return false;

          if (!shouldCaptureHorizontalSwipe(gestureState, BALANCED_SWIPE_CONFIG)) return false;
          return canSwipeSegments(gestureState.dx);
        },
        // onMoveShouldSetPanResponderCapture is intentionally absent.
        // AppRoot coordinates priority via isObligationsSegmentSwipe() in its
        // bubble-phase handler. The capture phase was pre-empting AppRoot
        // before its guard logic could run, causing gesture misrouting.
        onPanResponderRelease: (_event, gestureState) => {
          if (swipeLocked) return;
          if (Date.now() < swipeCooldownUntilRef.current) return;
          if (isGlobalSwipeLocked()) return;

          const activeInput = TextInput.State?.currentlyFocusedInput?.();
          if (activeInput) return;

          if (!shouldCommitHorizontalSwipe(gestureState, BALANCED_SWIPE_CONFIG)) return;
          if (!canSwipeSegments(gestureState.dx)) return;

          swipeCooldownUntilRef.current = Date.now() + BALANCED_SWIPE_CONFIG.cooldownMs;
          if (gestureState.dx < 0) {
            setSegment("receivables");
          } else {
            setSegment("payables");
          }
        },
      }),
    [canSwipeSegments, swipeLocked]
  );

  return {
    segment,
    setSegment,
    panHandlers: segmentPanResponder.panHandlers,
  };
}
