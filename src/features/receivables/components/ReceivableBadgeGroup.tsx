import React from "react";
import { View } from "react-native";

import { components } from "../../../styles/tokens";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export type ReceivableBadgeItem = {
  key: string;
  label: string;
  backgroundColor: string;
  textColor: string;
};

type ReceivableBadgeGroupProps = {
  badges: ReceivableBadgeItem[];
  align?: "left" | "right";
};

export function ReceivableBadgeGroup({ badges, align = "left" }: ReceivableBadgeGroupProps) {
  if (badges.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        gap: 8,
        flexWrap: "wrap",
        flex: align === "left" ? 1 : undefined,
        minWidth: 0,
      }}
    >
      {badges.map((badge) => (
        <StatusBadge
          key={badge.key}
          label={badge.label}
          backgroundColor={badge.backgroundColor}
          textColor={badge.textColor}
          textStyle={{ fontSize: components.badgeFontSize }}
        />
      ))}
    </View>
  );
}
