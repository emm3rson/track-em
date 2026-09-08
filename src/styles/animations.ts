import { Easing } from "react-native-reanimated";

export const animationDurations = {
  fast: 140,
  normal: 240,
  slow: 300,
} as const;

export const animationEasings = {
  // commonly used for slide-ins (e.g. from bottom)
  enter: Easing.bezier(0.22, 1, 0.36, 1),
  // commonly used for slide-outs (e.g. to bottom)
  exit: Easing.bezier(0.4, 0, 1, 1),
  // general purpose
  standard: Easing.bezier(0.4, 0, 0.2, 1),
} as const;
