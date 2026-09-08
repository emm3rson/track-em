import React from "react";
import { StyleProp, ViewStyle } from "react-native";

import { components } from "../../styles/tokens";
import { Card, CardProps } from "../Themed";

type SectionCardProps = Omit<CardProps, "variant"> & {
  style?: StyleProp<ViewStyle>;
};

export function SectionCard({ style, ...props }: SectionCardProps) {
  return (
    <Card
      variant="section"
      {...props}
      style={[{ padding: components.sectionCardPadding, gap: components.sectionCardGap }, style]}
    />
  );
}
