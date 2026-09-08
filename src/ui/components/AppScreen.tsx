import React from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";
import { layout } from "../../styles/tokens";
import { LoadingPlaceholder } from "../../components/LoadingPlaceholder";
import { ScreenGradient } from "../../components/ScreenGradient";

type AppScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  loading?: boolean;
  loadingLabel?: string;
  header?: React.ReactNode;
  /** When true, excludes top edge from SafeAreaView (stack navigator header handles it). */
  stackHeader?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  rootStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
  panHandlers?: ViewProps;
};

export function AppScreen({
  children,
  style,
  loading = false,
  loadingLabel = "Loading...",
  header,
  stackHeader = false,
  scrollRef,
  contentContainerStyle,
  rootStyle,
  scrollStyle,
  panHandlers,
}: AppScreenProps) {
  const { colors } = useTheme();
  const safeAreaEdges = stackHeader
    ? (["bottom", "left", "right"] as const)
    : (["top", "left", "right"] as const);

  const content = (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }, rootStyle]}
      edges={safeAreaEdges}
    >
      <ScreenGradient />
      {loading ? (
        <LoadingPlaceholder label={loadingLabel} />
      ) : header != null || scrollRef != null || panHandlers != null ? (
        <View style={styles.root} {...panHandlers}>
          <ScrollView
            ref={scrollRef}
            style={scrollStyle}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          >
            {header}
            {children}
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.defaultContainer, style]}>{children}</View>
      )}
    </SafeAreaView>
  );

  return content;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.screenPadding,
    gap: layout.screenGap,
    backgroundColor: "transparent",
  },
  defaultContainer: {
    flex: 1,
    padding: 16,
  },
});
