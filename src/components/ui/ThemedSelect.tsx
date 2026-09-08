import React, { useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";

import { radius } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Themed";
import { FieldShell } from "./FieldShell";

export type SelectItem<T> = { label: string; value: T; icon?: React.ReactNode };

type Anchor = { x: number; y: number; width: number; height: number };

type ThemedSelectProps<T> = {
  selectedValue: T | undefined;
  onValueChange: (value: T) => void;
  items: SelectItem<T>[];
  placeholder?: string;
  accessibilityLabel?: string;
  muted?: boolean;
};

export function ThemedSelect<T>({
  selectedValue,
  onValueChange,
  items,
  placeholder = "Select an option",
  accessibilityLabel,
  muted = false,
}: ThemedSelectProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<View>(null);

  const selectedItem = items.find((i) => i.value === selectedValue);
  const selectedLabel = selectedItem?.label ?? placeholder;

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      {/* collapsable={false} is required on Android for measureInWindow to work.
          Wraps the entire FieldShell so the measured width matches the visible field. */}
      <View ref={triggerRef} collapsable={false}>
        <FieldShell muted={muted} style={styles.fieldShell}>
          <Pressable
            onPress={openDropdown}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={styles.triggerButton}
          >
            {selectedItem?.icon ? (
              <View style={styles.triggerIcon}>{selectedItem.icon}</View>
            ) : null}
            <Text style={[styles.triggerLabel, { color: colors.text }]} numberOfLines={1}>
              {selectedLabel}
            </Text>
            {open ? (
              <ChevronUp size={18} color={colors.mutedText} style={styles.triggerChevron} />
            ) : (
              <ChevronDown size={18} color={colors.mutedText} style={styles.triggerChevron} />
            )}
          </Pressable>
        </FieldShell>
      </View>

      {/* Anchored dropdown */}
      {anchor && (
        <Modal
          visible={open}
          transparent
          animationType="none"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable
              onPress={() => {}}
              style={[
                styles.dropdownPanel,
                {
                  top: anchor.y + anchor.height + 4,
                  left: anchor.x,
                  width: anchor.width,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <FlatList
                data={items}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <Pressable
                      onPress={() => {
                        onValueChange(item.value);
                        setOpen(false);
                      }}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: isSelected ? colors.surfaceAlt : "transparent",
                        },
                      ]}
                    >
                      {item.icon ? <View style={styles.optionIcon}>{item.icon}</View> : null}
                      <Text style={[styles.optionLabel, { color: colors.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {isSelected ? (
                        <Check size={16} color={colors.success} style={styles.optionCheck} />
                      ) : null}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => (
                  <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />
                )}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldShell: {
    height: 50,
    padding: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
    overflow: "hidden",
  },
  triggerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerIcon: {
    marginRight: 8,
  },
  triggerLabel: {
    flex: 1,
  },
  triggerChevron: {
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
  },
  dropdownPanel: {
    position: "absolute",
    borderRadius: radius.md,
    overflow: "hidden",
    maxHeight: 240,
    boxShadow: `0px 4px 10px rgba(0, 0, 0, 0.08)`,
  },
  optionRow: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    marginRight: 8,
  },
  optionLabel: {
    flex: 1,
  },
  optionCheck: {
    marginLeft: 8,
  },
  optionDivider: {
    height: 1,
  },
});
