import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from "react-native";

import { Info } from "lucide-react-native";

import { radius } from "../../styles/tokens";
import { getActionShadowStyle } from "../../styles/shadows";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Themed";

const EDGE_PADDING = 12;
const POPOVER_MAX_WIDTH = 280;
const POPOVER_GAP = 8;
const ESTIMATED_HEIGHT = 112;

type InfoTooltipProps = {
  title: string;
  message: string;
};

export function InfoTooltip({ title, message }: InfoTooltipProps) {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const [popoverSize, setPopoverSize] = useState<{ width: number; height: number } | null>(null);
  const triggerRef = useRef<View>(null);

  const closeTooltip = () => setOpen(false);

  const openTooltip = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setPopoverSize(null);
      setOpen(true);
    });
  };

  const popoverMaxWidth = Math.max(
    180,
    Math.min(POPOVER_MAX_WIDTH, screenWidth - EDGE_PADDING * 2)
  );

  const popoverPosition = useMemo(() => {
    if (!anchor) return null;

    const measuredWidth = Math.min(popoverSize?.width ?? popoverMaxWidth, popoverMaxWidth);
    const measuredHeight = popoverSize?.height ?? ESTIMATED_HEIGHT;
    const maxLeft = Math.max(EDGE_PADDING, screenWidth - EDGE_PADDING - measuredWidth);
    const preferredLeft = anchor.x;
    const left = Math.max(EDGE_PADDING, Math.min(maxLeft, preferredLeft));

    const preferredTopAbove = anchor.y - POPOVER_GAP - measuredHeight;
    const preferredTopBelow = anchor.y + anchor.height + POPOVER_GAP;
    const minTop = EDGE_PADDING;
    const maxTop = Math.max(minTop, screenHeight - EDGE_PADDING - measuredHeight);
    const canPlaceAbove = preferredTopAbove >= minTop;
    const canPlaceBelow = preferredTopBelow <= maxTop;

    let top = preferredTopAbove;
    if (!canPlaceAbove) {
      top = canPlaceBelow
        ? preferredTopBelow
        : Math.max(minTop, Math.min(maxTop, preferredTopBelow));
    }

    return { top, left };
  }, [anchor, popoverMaxWidth, popoverSize?.height, popoverSize?.width, screenHeight, screenWidth]);

  const onPopoverLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPopoverSize((prev) => {
      if (prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
        return prev;
      }
      return { width, height };
    });
  };

  return (
    <>
      {/* collapsable={false} required on Android for measureInWindow */}
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openTooltip}
          accessibilityRole="button"
          hitSlop={6}
          style={{ opacity: 0.85 }}
        >
          <Info size={16} color={colors.mutedText} />
        </Pressable>
      </View>

      {anchor && (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          hardwareAccelerated
          onRequestClose={closeTooltip}
        >
          <Pressable style={styles.overlay} onPress={closeTooltip}>
            {popoverPosition ? (
              <Pressable
                onPress={() => {}}
                onLayout={onPopoverLayout}
                style={[
                  styles.popover,
                  {
                    top: popoverPosition.top,
                    left: popoverPosition.left,
                    maxWidth: popoverMaxWidth,
                    backgroundColor: colors.surface,
                  },
                  getActionShadowStyle(colors),
                ]}
              >
                <Text style={{ fontWeight: "700", color: colors.text }}>{title}</Text>
                <Text style={{ color: colors.mutedText, fontSize: 13, lineHeight: 18 }}>
                  {message}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  popover: {
    position: "absolute",
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
});
