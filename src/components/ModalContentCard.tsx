import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Card } from "./Themed";
import { layout } from "../styles/tokens";

type ModalContentCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ModalContentCard({ children, style }: ModalContentCardProps) {
  return (
    <Card variant="modal" style={[styles.card, style]}>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: layout.modalPaddingHorizontal,
    paddingVertical: layout.modalPaddingVertical,
    gap: layout.sectionGap,
  },
});
