import React from "react";
import { StyleProp, TextStyle, View } from "react-native";

import { components, spacing } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Themed";

type FormLabelProps = {
  children: React.ReactNode;
  optional?: boolean;
  style?: StyleProp<TextStyle>;
};

export function FormLabel({ children, optional = false, style }: FormLabelProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.xxs }}>
      <Text
        style={[
          {
            fontWeight: "700",
            fontSize: components.formLabelFontSize,
            color: colors.text,
          },
          style,
        ]}
      >
        {children}
      </Text>
      {optional ? <Text style={{ color: colors.mutedText }}>(optional)</Text> : null}
    </View>
  );
}
