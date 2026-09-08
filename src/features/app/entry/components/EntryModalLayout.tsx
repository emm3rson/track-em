import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { ModalCard } from "../../../../components/ModalCard";
import { ModalContentCard } from "../../../../components/ModalContentCard";
import { ModalHeaderBar } from "../../../../components/ui/ModalHeaderBar";
import { spacing } from "../../../../styles/tokens";

type EntryModalLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function EntryModalLayout({ title, subtitle, children }: EntryModalLayoutProps) {
  const navigation = useNavigation();

  return (
    <ModalCard
      visible={true}
      onRequestClose={() => navigation.goBack()}
      useCard={false}
      scrollable
      contentLayout="bounded"
    >
      <ModalContentCard style={styles.contentCard}>
        <ModalHeaderBar title={title} subtitle={subtitle} />
        <View style={styles.formContainer}>{children}</View>
      </ModalContentCard>
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  contentCard: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexShrink: 1, // ensure it shrinks within bounded ModalCard scrollview if needed
  },
  formContainer: {
    gap: spacing.md,
  },
});
