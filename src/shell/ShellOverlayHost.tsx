import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { DemoModeBanner } from "./DemoModeBanner";
import { UpdatePromptModal } from "./UpdatePromptModal";
import { IntroAnimation } from "../components/ui/IntroAnimation";
import { useOTAUpdate } from "../hooks/useOTAUpdate";

type ShellOverlayHostProps = {
  children: React.ReactNode;
  showDemoBanner?: boolean;
};

export function ShellOverlayHost({ children, showDemoBanner = false }: ShellOverlayHostProps) {
  const [showIntro, setShowIntro] = useState(true);
  const { updateReady, updateMessage, applyUpdate, dismiss } = useOTAUpdate();

  return (
    <View style={styles.root}>
      <DemoModeBanner visible={showDemoBanner} />
      <View style={styles.content}>{children}</View>
      {showIntro ? (
        <IntroAnimation variant="fade" onAnimationComplete={() => setShowIntro(false)} />
      ) : null}
      <UpdatePromptModal
        visible={updateReady}
        onUpdate={applyUpdate}
        onDismiss={dismiss}
        message={updateMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
