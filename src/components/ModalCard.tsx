import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  type ModalProps,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";

import { Card } from "./Themed";
import { semantic } from "../styles/tokens";

type ModalCardProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  onBackdropPress?: () => void;
  variant?: "pressable" | "absolute";
  backdropStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
  animationType?: ModalProps["animationType"];
  transparent?: boolean;
  useCard?: boolean;
  scrollable?: boolean;
  contentLayout?: "default" | "bounded";
};

const INNER_STYLE: ViewStyle = {
  width: "100%",
};
const BOUNDED_INNER_STYLE: ViewStyle = {
  maxHeight: "100%",
  minHeight: 0,
};
const MODAL_PADDING_HORIZONTAL = 16;
const MODAL_PADDING_VERTICAL = 24;
const ABSOLUTE_CONTAINER_STYLE: ViewStyle = {
  flex: 1,
  paddingHorizontal: MODAL_PADDING_HORIZONTAL,
  paddingVertical: MODAL_PADDING_VERTICAL,
  justifyContent: "center",
};
const FLEX_STYLE: ViewStyle = {
  flex: 1,
};
const FULL_WIDTH_STYLE: ViewStyle = {
  width: "100%",
};

export function ModalCard({
  visible,
  onRequestClose,
  onBackdropPress,
  children,
  variant = "pressable",
  backdropStyle,
  containerStyle,
  innerStyle,
  cardStyle,
  animationType = "none",
  transparent = true,
  useCard = true,
  scrollable = false,
  contentLayout = "default",
}: ModalCardProps) {
  const handleBackdropPress = onBackdropPress ?? onRequestClose;
  const boundedLayoutStyle = contentLayout === "bounded" ? BOUNDED_INNER_STYLE : null;
  const useKeyboardAvoidance = !scrollable && Platform.OS === "ios";
  const backdropBase: ViewStyle = {
    flex: 1,
    backgroundColor: semantic.overlay.scrim,
    justifyContent: "center",
    paddingHorizontal: MODAL_PADDING_HORIZONTAL,
    paddingVertical: MODAL_PADDING_VERTICAL,
  };
  const SCROLLABLE_PRESSABLE_STYLE: ViewStyle = {
    width: "100%",
    maxHeight: "100%",
    flexShrink: 1,
  };
  const absoluteBackdropBase: ViewStyle = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: semantic.overlay.scrim,
  };
  const content = useCard ? (
    <Animated.View entering={SlideInDown.springify().duration(280)}>
      <Card
        variant="modal"
        style={[{ paddingHorizontal: 16, paddingVertical: 20, gap: 12 }, cardStyle]}
      >
        {children}
      </Card>
    </Animated.View>
  ) : (
    <Animated.View entering={SlideInDown.springify().duration(280)}>{children}</Animated.View>
  );
  const contentWrapper = scrollable ? (
    <ScrollView
      style={boundedLayoutStyle ?? undefined}
      contentContainerStyle={[INNER_STYLE, innerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={[INNER_STYLE, boundedLayoutStyle, innerStyle]}>{content}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      {scrollable ? (
        <View style={FLEX_STYLE}>
          {variant === "absolute" ? (
            <View style={[ABSOLUTE_CONTAINER_STYLE, containerStyle]}>
              <Pressable
                onPress={handleBackdropPress}
                style={[absoluteBackdropBase, backdropStyle]}
              />
              {contentWrapper}
            </View>
          ) : (
            <Pressable onPress={handleBackdropPress} style={[backdropBase, backdropStyle]}>
              <Pressable onPress={() => {}} style={SCROLLABLE_PRESSABLE_STYLE}>
                {contentWrapper}
              </Pressable>
            </Pressable>
          )}
        </View>
      ) : useKeyboardAvoidance ? (
        <KeyboardAvoidingView style={FLEX_STYLE} behavior="padding">
          {variant === "absolute" ? (
            <View style={[ABSOLUTE_CONTAINER_STYLE, containerStyle]}>
              <Pressable
                onPress={handleBackdropPress}
                style={[absoluteBackdropBase, backdropStyle]}
              />
              {contentWrapper}
            </View>
          ) : (
            <Pressable onPress={handleBackdropPress} style={[backdropBase, backdropStyle]}>
              <Pressable onPress={() => {}} style={FULL_WIDTH_STYLE}>
                {contentWrapper}
              </Pressable>
            </Pressable>
          )}
        </KeyboardAvoidingView>
      ) : (
        <View style={FLEX_STYLE}>
          {variant === "absolute" ? (
            <View style={[ABSOLUTE_CONTAINER_STYLE, containerStyle]}>
              <Pressable
                onPress={handleBackdropPress}
                style={[absoluteBackdropBase, backdropStyle]}
              />
              {contentWrapper}
            </View>
          ) : (
            <Pressable onPress={handleBackdropPress} style={[backdropBase, backdropStyle]}>
              <Pressable onPress={() => {}} style={FULL_WIDTH_STYLE}>
                {contentWrapper}
              </Pressable>
            </Pressable>
          )}
        </View>
      )}
    </Modal>
  );
}
