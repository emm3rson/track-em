import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { PRIMARY_COLOR_HEX } from "../../theme/colors";

export type AnimationVariant = "fade" | "slide" | "zoom";
export type TextColorVariant = "multicolor" | "green";

interface IntroAnimationProps {
  variant?: AnimationVariant;
  textColorVariant?: TextColorVariant;
  onAnimationComplete: () => void;
}

export function IntroAnimation({
  variant = "slide",
  textColorVariant = "green",
  onAnimationComplete,
}: IntroAnimationProps) {
  const { colors, fontFamily } = useTheme();

  // Shared Animation Values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(variant === "slide" ? 20 : 0)).current;
  const logoScale = useRef(new Animated.Value(variant === "zoom" ? 0.8 : 1)).current;

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerTranslateY = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let logoEntry: Animated.CompositeAnimation;
    let containerExit: Animated.CompositeAnimation;

    switch (variant) {
      case "fade":
        // Variant A: Fade In & Out
        logoEntry = Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        });
        containerExit = Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        });
        break;

      case "slide":
        // Variant B: Slide Up & Fade Out
        logoEntry = Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(logoTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]);
        containerExit = Animated.parallel([
          Animated.timing(containerOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(containerTranslateY, {
            toValue: -50,
            duration: 500,
            useNativeDriver: true,
          }),
        ]);
        break;

      case "zoom":
        // Variant C: Zoom In & Fade Out
        logoEntry = Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]);
        containerExit = Animated.parallel([
          Animated.timing(containerOpacity, {
            toValue: 0,
            duration: 800, // Smoother fade
            useNativeDriver: true,
          }),
          Animated.timing(containerScale, {
            toValue: 1.15, // Slightly more zoomout feel
            duration: 800,
            useNativeDriver: true,
          }),
        ]);
        break;
    }

    Animated.sequence([
      logoEntry,
      Animated.delay(800), // More time to admire the logo
      containerExit,
      Animated.delay(100), // Ensure it's fully gone
    ]).start(() => {
      onAnimationComplete();
    });
  }, [
    variant,
    logoOpacity,
    logoTranslateY,
    logoScale,
    containerOpacity,
    containerTranslateY,
    containerScale,
    onAnimationComplete,
  ]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: containerOpacity,
          transform: [{ translateY: containerTranslateY }, { scale: containerScale }],
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
          alignItems: "center",
        }}
      >
        <Animated.Image
          source={require("../../../assets/app-icon/adaptive-icon.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        {textColorVariant === "green" ? (
          <Animated.Text style={[styles.logoText, { fontFamily, color: PRIMARY_COLOR_HEX.green }]}>
            Track'Em
          </Animated.Text>
        ) : (
          <Animated.Text style={[styles.logoText, { fontFamily }]}>
            <Animated.Text style={{ color: PRIMARY_COLOR_HEX.blue }}>Track</Animated.Text>
            <Animated.Text style={{ color: PRIMARY_COLOR_HEX.orange }}>'Em</Animated.Text>
          </Animated.Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999, // Ensure it covers the whole app
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: -40,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
