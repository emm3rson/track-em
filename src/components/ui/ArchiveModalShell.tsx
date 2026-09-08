import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { ModalCard } from "../ModalCard";
import { ModalContentCard } from "../ModalContentCard";
import { ModalHeaderBar } from "./ModalHeaderBar";
import { CloseIconButton } from "./CloseIconButton";

type ArchiveModalShellProps = {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  children: React.ReactNode;
  subtitle?: string;
  accessibilityLabelClose?: string;
  bodyMinHeight?: number;
};

const ARCHIVE_MODAL_MAX_HEIGHT_RATIO = 0.92;
const ARCHIVE_MODAL_BODY_RESERVED_HEIGHT = 120;
const ARCHIVE_MODAL_MIN_BODY_HEIGHT = 140;

export function ArchiveModalShell({
  visible,
  onRequestClose,
  title,
  subtitle,
  children,
  accessibilityLabelClose,
  bodyMinHeight,
}: ArchiveModalShellProps) {
  const { height: windowHeight } = useWindowDimensions();
  const cardMaxHeight = Math.round(windowHeight * ARCHIVE_MODAL_MAX_HEIGHT_RATIO);
  const bodyMaxHeight = Math.max(
    ARCHIVE_MODAL_MIN_BODY_HEIGHT,
    cardMaxHeight - ARCHIVE_MODAL_BODY_RESERVED_HEIGHT
  );
  const resolvedBodyMinHeight = Math.min(bodyMaxHeight, Math.max(0, bodyMinHeight ?? 0));

  return (
    <ModalCard
      visible={visible}
      onRequestClose={onRequestClose}
      variant="absolute"
      innerStyle={styles.inner}
      useCard={false}
      scrollable={false}
      contentLayout="bounded"
    >
      <ModalContentCard style={[styles.card, { maxHeight: cardMaxHeight }]}>
        <ModalHeaderBar
          title={title}
          subtitle={subtitle}
          rightContent={
            <CloseIconButton
              onPress={onRequestClose}
              accessibilityLabel={accessibilityLabelClose ?? `Close ${title}`}
            />
          }
        />
        <View style={[styles.body, { maxHeight: bodyMaxHeight, minHeight: resolvedBodyMinHeight }]}>
          {children}
        </View>
      </ModalContentCard>
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    width: "100%",
    maxHeight: "92%",
  },
  card: {
    width: "100%",
    overflow: "hidden",
  },
  body: {
    width: "100%",
    minHeight: 0,
  },
});
