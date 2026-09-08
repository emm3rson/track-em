import type { PanResponderGestureState } from "react-native";

export type HorizontalSwipeConfig = {
  activationDistance: number;
  minDistance: number;
  maxVerticalDrift: number;
  minVelocity: number;
  intentRatio: number;
  cooldownMs: number;
};

export const BALANCED_SWIPE_CONFIG: HorizontalSwipeConfig = {
  activationDistance: 14,
  minDistance: 44,
  maxVerticalDrift: 56,
  minVelocity: 0.2,
  intentRatio: 1.05,
  cooldownMs: 320,
};

export function shouldCaptureHorizontalSwipe(
  gestureState: PanResponderGestureState,
  config: HorizontalSwipeConfig
) {
  const absDx = Math.abs(gestureState.dx);
  const absDy = Math.abs(gestureState.dy);

  if (absDx < config.activationDistance) return false;
  if (absDy > config.maxVerticalDrift) return false;
  return absDx > absDy * config.intentRatio;
}

export function shouldCommitHorizontalSwipe(
  gestureState: PanResponderGestureState,
  config: HorizontalSwipeConfig
) {
  const absDx = Math.abs(gestureState.dx);
  const absDy = Math.abs(gestureState.dy);
  const hasDistance = absDx >= config.minDistance;
  const hasVelocity = Math.abs(gestureState.vx) >= config.minVelocity;

  if (!hasDistance && !hasVelocity) return false;
  if (absDy > config.maxVerticalDrift) return false;
  return absDx > absDy * config.intentRatio;
}
