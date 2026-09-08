import React from "react";

import { radius, spacing } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { Card, type CardProps } from "../Themed";

type InnerCardProps = CardProps & {
  muted?: boolean;
};

export function InnerCard({ muted = false, style, ...props }: InnerCardProps) {
  const { colors } = useTheme();

  return (
    <Card
      {...props}
      style={[
        {
          padding: spacing.md,
          borderWidth: 0,
          borderRadius: radius.md,
          backgroundColor: muted ? colors.surfaceMuted : colors.surfaceAlt,
        },
        style,
      ]}
    />
  );
}
