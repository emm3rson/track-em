import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { CreditCard, HandCoins } from "lucide-react-native";

import { motion, radius } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";

type Props = {
  segment: "payables" | "receivables";
  setSegment: (segment: "payables" | "receivables") => void;
};

export function ObligationsSegmentControl({ segment, setSegment }: Props) {
  const { colors } = useTheme();
  const [segmentControlWidth, setSegmentControlWidth] = useState(0);
  const indicatorTranslateX = useSharedValue(0);

  useEffect(() => {
    const half = segmentControlWidth / 2;
    const target = segment === "payables" ? 0 : half;
    indicatorTranslateX.value = withTiming(target, { duration: motion.normal });
  }, [indicatorTranslateX, segment, segmentControlWidth]);

  const segmentIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorTranslateX.value }],
  }));

  return (
    <View
      onLayout={(event) => setSegmentControlWidth(event.nativeEvent.layout.width)}
      style={[styles.segmentControl, { borderColor: colors.border }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.segmentIndicator,
          { backgroundColor: colors.primaryBg },
          segmentIndicatorStyle,
        ]}
      />
      <Pressable
        onPress={() => setSegment("payables")}
        accessibilityRole="tab"
        accessibilityState={{ selected: segment === "payables" }}
        accessibilityLabel="Payables"
        style={[styles.segmentButton, styles.segmentButtonLeft]}
      >
        <CreditCard size={18} color={segment === "payables" ? colors.primaryText : colors.text} />
        <Text
          style={{
            color: segment === "payables" ? colors.primaryText : colors.text,
            fontWeight: "700",
          }}
        >
          Payables
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setSegment("receivables")}
        accessibilityRole="tab"
        accessibilityState={{ selected: segment === "receivables" }}
        accessibilityLabel="Receivables"
        style={[styles.segmentButton, styles.segmentButtonRight]}
      >
        <HandCoins size={18} color={segment === "receivables" ? colors.primaryText : colors.text} />
        <Text
          style={{
            color: segment === "receivables" ? colors.primaryText : colors.text,
            fontWeight: "700",
          }}
        >
          Receivables
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentControl: {
    position: "relative",
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  segmentIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  segmentButtonLeft: {
    borderTopLeftRadius: radius.md - 1,
    borderBottomLeftRadius: radius.md - 1,
  },
  segmentButtonRight: {
    borderTopRightRadius: radius.md - 1,
    borderBottomRightRadius: radius.md - 1,
  },
});
