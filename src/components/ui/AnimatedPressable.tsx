import React from "react";
import { Pressable, type PressableProps, type PressableStateCallbackType } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 300 };

export function AnimatedPressable({ onPressIn, onPressOut, style, ...rest }: PressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const resolvedStyle =
    typeof style === "function"
      ? (state: PressableStateCallbackType) => [style(state), animatedStyle]
      : [style, animatedStyle];

  return (
    <AnimatedPressableBase
      onPressIn={(e) => {
        scale.value = withSpring(0.97, SPRING_CONFIG);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1.0, SPRING_CONFIG);
        onPressOut?.(e);
      }}
      style={resolvedStyle as PressableProps["style"]}
      {...rest}
    />
  );
}
