import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Text } from "../Themed";
import { components, layout, semantic, spacing } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { animationDurations, animationEasings } from "../../styles/animations";

const BACKDROP_OPEN_DURATION_MS = animationDurations.slow;
const CLOSE_DURATION_MS = animationDurations.normal;
const OFFSCREEN_Y = 500; // fallback before first layout measurement
const OPEN_BACKDROP_EASING = animationEasings.enter;
const CLOSE_EASING = animationEasings.exit;

export type ActionBottomSheetActionTone = "default" | "success" | "danger";

export type ActionBottomSheetAction = {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ActionBottomSheetActionTone;
  accessibilityLabel?: string;
  Icon?: LucideIcon;
  /** Override icon color for `grid-flat` variant actions. Ignored in `default`. */
  iconTintColor?: string;
  /** Override the rendered icon size for visual consistency across mixed icon sets. */
  iconSize?: number;
};

export type ActionBottomSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: ActionBottomSheetAction[];
  onClose: () => void;
  variant?: "default" | "grid-flat";
};

type ActionRowProps = {
  action: ActionBottomSheetAction;
  closing: boolean;
  color: string;
  variant?: "default" | "grid-flat";
};

function renderIcon(Icon: LucideIcon | undefined, color: string, size: number) {
  if (Icon) {
    return <Icon size={size} color={color} />;
  }
  return null;
}

function ActionRow({ action, closing, color, variant }: ActionRowProps) {
  const disabled = closing || action.disabled;
  const isGridFlat = variant === "grid-flat";

  const iconColor = isGridFlat ? (action.iconTintColor ?? color) : color;

  const defaultIconSize = isGridFlat ? 28 : 18;
  const icon = renderIcon(action.Icon, iconColor ?? color, action.iconSize ?? defaultIconSize);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      disabled={disabled}
      onPress={action.onPress}
      style={({ pressed }) => [
        isGridFlat ? styles.gridActionRowTransparent : styles.actionRow,
        { opacity: disabled ? 0.5 : pressed ? (isGridFlat ? 0.82 : 0.7) : 1 },
      ]}
    >
      {isGridFlat ? (
        <View style={styles.gridActionContent}>
          <View style={styles.gridFlatIconContainer}>{icon}</View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              marginTop: spacing.xxs,
              textAlign: "center",
            }}
          >
            {action.label}
          </Text>
        </View>
      ) : (
        <View style={styles.defaultActionContent}>
          {icon}
          <Text
            style={{ fontSize: components.bottomSheetActionFontSize, fontWeight: "700", color }}
          >
            {action.label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function ActionBottomSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
  variant = "default",
}: ActionBottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const gestureConfig = components.bottomSheetGesture;
  const [isMounted, setIsMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibleStateRef = useRef<{
    title: string;
    subtitle?: string;
    actions: ActionBottomSheetAction[];
  }>({
    title,
    subtitle,
    actions,
  });
  const sheetHeightRef = useRef(0);
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(OFFSCREEN_Y);
  const dismissDistance = useSharedValue<number>(gestureConfig.minDismissDistance);
  const dismissedByGesture = useSharedValue<boolean>(false);

  if (visible) {
    lastVisibleStateRef.current = { title, subtitle, actions };
  }

  useEffect(() => {
    dismissDistance.value = Math.max(
      gestureConfig.minDismissDistance,
      sheetHeight * gestureConfig.dismissDistanceRatio
    );
  }, [
    dismissDistance,
    gestureConfig.dismissDistanceRatio,
    gestureConfig.minDismissDistance,
    sheetHeight,
  ]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(visible && isMounted)
        .minDistance(gestureConfig.activationDistance)
        .onBegin(() => {
          if (!visible || !isMounted) return;
          dismissedByGesture.value = false;
          if (translateY.value < gestureConfig.maxUpwardTranslation) {
            translateY.value = gestureConfig.maxUpwardTranslation;
          }
        })
        .onUpdate((event) => {
          if (!visible || !isMounted) return;
          translateY.value = Math.max(gestureConfig.maxUpwardTranslation, event.translationY);
        })
        .onEnd((event) => {
          if (!visible || !isMounted) return;
          const dy = Math.max(gestureConfig.maxUpwardTranslation, event.translationY);
          const shouldDismiss =
            dy >= dismissDistance.value || event.velocityY >= gestureConfig.minDismissVelocity;
          if (shouldDismiss) {
            dismissedByGesture.value = true;
            runOnJS(onClose)();
            return;
          }
          translateY.value = withSpring(0, {
            damping: gestureConfig.springDamping,
            stiffness: gestureConfig.springStiffness,
          });
        })
        .onFinalize(() => {
          if (!visible || !isMounted) return;
          if (dismissedByGesture.value) return;
          translateY.value = withSpring(0, {
            damping: gestureConfig.springDamping,
            stiffness: gestureConfig.springStiffness,
          });
        }),
    [
      dismissDistance,
      gestureConfig.activationDistance,
      gestureConfig.maxUpwardTranslation,
      gestureConfig.minDismissVelocity,
      gestureConfig.springDamping,
      gestureConfig.springStiffness,
      isMounted,
      onClose,
      dismissedByGesture,
      translateY,
      visible,
    ]
  );

  useEffect(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    if (visible) {
      setIsMounted(true);
      // Ensure the sheet starts below the screen before springing in
      if (translateY.value < 1) {
        translateY.value = sheetHeightRef.current > 0 ? sheetHeightRef.current : OFFSCREEN_Y;
      }
      backdropOpacity.value = withTiming(1, {
        duration: BACKDROP_OPEN_DURATION_MS,
        easing: OPEN_BACKDROP_EASING,
      });
      translateY.value = withSpring(0, {
        damping: 26,
        stiffness: 220,
        mass: 1,
      });
      return;
    }

    if (!isMounted) {
      return;
    }

    const closedY = sheetHeightRef.current > 0 ? sheetHeightRef.current + 20 : OFFSCREEN_Y;
    backdropOpacity.value = withTiming(0, {
      duration: CLOSE_DURATION_MS,
      easing: CLOSE_EASING,
    });
    translateY.value = withTiming(closedY, {
      duration: CLOSE_DURATION_MS,
      easing: CLOSE_EASING,
    });
    dismissTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
      dismissTimeoutRef.current = null;
    }, CLOSE_DURATION_MS);
  }, [backdropOpacity, isMounted, translateY, visible]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      backdropOpacity.value *
      interpolate(translateY.value, [0, dismissDistance.value], [1, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isMounted) {
    return null;
  }

  const displayState = visible ? { title, subtitle, actions } : lastVisibleStateRef.current;
  const closing = !visible;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close action sheet"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheetGestureSurface, sheetStyle]}>
            <Card
              variant="modal"
              onLayout={(event) => {
                const h = event.nativeEvent.layout.height;
                sheetHeightRef.current = h;
                setSheetHeight(h);
              }}
              style={[
                styles.sheet,
                {
                  paddingBottom: Math.max(insets.bottom, components.bottomSheetPaddingBottomMin),
                },
              ]}
            >
              <View style={styles.dragHeader}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <View style={styles.headerTextBlock}>
                  <Text style={styles.title}>{displayState.title}</Text>
                  {displayState.subtitle ? (
                    <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                      {displayState.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.actionGroup, variant === "grid-flat" && styles.gridActionGroup]}>
                {displayState.actions.map((action, index) => {
                  const color =
                    action.tone === "danger"
                      ? colors.danger
                      : action.tone === "success"
                        ? colors.success
                        : colors.text;

                  if (variant === "grid-flat") {
                    return (
                      <ActionRow
                        key={action.key}
                        action={action}
                        closing={closing}
                        color={color}
                        variant={variant}
                      />
                    );
                  }

                  return (
                    <React.Fragment key={action.key}>
                      <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
                      <ActionRow action={action} closing={closing} color={color} />
                      {index === displayState.actions.length - 1 ? (
                        <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </View>
            </Card>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: semantic.overlay.scrim,
    zIndex: 0,
  },
  sheetGestureSurface: {
    width: "100%",
    zIndex: 1,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: components.bottomSheetTopRadius,
    borderTopRightRadius: components.bottomSheetTopRadius,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: layout.modalPaddingHorizontal,
    paddingTop: components.bottomSheetPaddingTop,
    gap: components.bottomSheetSheetGap,
  },
  handle: {
    width: components.bottomSheetHandleWidth,
    height: components.bottomSheetHandleHeight,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: components.bottomSheetSheetGap,
  },
  dragHeader: {
    paddingTop: 0,
  },
  headerTextBlock: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: components.bottomSheetTitleFontSize,
  },
  subtitle: {
    textAlign: "center",
    fontSize: components.bottomSheetSubtitleFontSize,
  },
  actionGroup: {
    marginTop: components.bottomSheetActionGroupMarginTop,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  actionRow: {
    minHeight: components.bottomSheetActionRowMinHeight,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.md,
  },
  gridActionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: spacing.md,
    rowGap: spacing.lg,
  },
  gridActionRowTransparent: {
    width: "28%",
    aspectRatio: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  gridFlatIconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultActionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  gridActionContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
});
