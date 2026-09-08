import React, { useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View, type LayoutRectangle } from "react-native";

import { MoreVertical } from "lucide-react-native";

import { Text } from "../Themed";
import { getActionShadowStyle } from "../../styles/shadows";
import { useTheme } from "../../theme/ThemeProvider";

export type OverflowMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void | Promise<void>;
};

type ModalOverflowMenuProps = {
  actions: OverflowMenuItem[];
  accessibilityLabel?: string;
};

const MENU_WIDTH = 220;
const MENU_OFFSET = 8;
const SCREEN_EDGE_PADDING = 12;
const MENU_ITEM_HEIGHT = 46;

export function ModalOverflowMenu({
  actions,
  accessibilityLabel = "Open more actions",
}: ModalOverflowMenuProps) {
  const { colors } = useTheme();
  const triggerRef = useRef<View | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);

  const menuPosition = useMemo(() => {
    if (!anchor) return null;

    const screen = Dimensions.get("window");
    const estimatedMenuHeight = actions.length * MENU_ITEM_HEIGHT + 16;
    const maxLeft = screen.width - MENU_WIDTH - SCREEN_EDGE_PADDING;
    const initialLeft = anchor.x + anchor.width - MENU_WIDTH;
    const left = Math.max(SCREEN_EDGE_PADDING, Math.min(maxLeft, initialLeft));

    let top = anchor.y + anchor.height + MENU_OFFSET;
    if (top + estimatedMenuHeight > screen.height - SCREEN_EDGE_PADDING) {
      top = Math.max(SCREEN_EDGE_PADDING, anchor.y - estimatedMenuHeight - MENU_OFFSET);
    }

    return { top, left };
  }, [actions.length, anchor]);

  const openMenu = () => {
    if (!actions.length) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const closeMenu = () => setOpen(false);

  if (!actions.length) return null;

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={openMenu}
          style={styles.triggerButton}
        >
          <MoreVertical size={18} color={colors.mutedText} />
        </Pressable>
      </View>

      <Modal transparent animationType="fade" visible={open} onRequestClose={closeMenu}>
        <Pressable onPress={closeMenu} style={styles.overlay}>
          {menuPosition ? (
            <Pressable
              accessibilityRole="menu"
              onPress={() => {}}
              style={[
                styles.menuCard,
                {
                  top: menuPosition.top,
                  left: menuPosition.left,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                getActionShadowStyle(colors),
              ]}
            >
              {actions.map((action) => {
                const toneColor = action.tone === "danger" ? colors.danger : colors.text;
                return (
                  <Pressable
                    key={action.key}
                    accessibilityRole="button"
                    accessibilityLabel={action.accessibilityLabel ?? action.label}
                    onPress={() => {
                      closeMenu();
                      void action.onPress();
                    }}
                    disabled={action.disabled}
                    style={styles.menuItem}
                  >
                    <View
                      style={[styles.menuItemContent, action.disabled ? styles.disabled : null]}
                    >
                      <View style={styles.iconSlot}>{action.icon}</View>
                      <Text style={[styles.menuLabel, { color: toneColor }]}>{action.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  triggerButton: {
    width: 40,
    height: 40,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: {
    position: "absolute",
    width: MENU_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    overflow: "hidden",
  },
  menuItem: {
    minHeight: MENU_ITEM_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconSlot: {
    width: 22,
    alignItems: "center",
  },
  menuLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.55,
  },
});
