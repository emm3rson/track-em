import React, { useEffect } from "react";
import { View, ViewStyle, type StyleProp } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { radius, spacing } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type ProgressBarRowProps = {
  ratio: number;
  fillColor: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
  triggerKey?: string | number;
};

export function ProgressBarRow({
  ratio,
  fillColor,
  trackColor,
  style,
  height = spacing.xs,
  triggerKey,
}: ProgressBarRowProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(clamp01(ratio), { duration: 600 });
  }, [progress, ratio, triggerKey]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${(progress.value * 100).toFixed(4)}%` as `${number}%`,
  }));

  return (
    <View
      style={[
        {
          height,
          borderRadius: radius.pill,
          overflow: "hidden",
          backgroundColor: trackColor ?? colors.chartTrack,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          { height: "100%", borderRadius: radius.pill, backgroundColor: fillColor },
          fillStyle,
        ]}
      />
    </View>
  );
}
