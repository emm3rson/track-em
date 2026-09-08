import React from "react";
import { Pressable, View } from "react-native";

import { Card, Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";
import { formatMonthLabel } from "../../../../utils/dates";
import type { CreditRow } from "../../../../features/payables/types";
import type { PayableEntryTarget } from "../types";
import { PayableMonthContent } from "../../../../features/payables/components/PayableMonthContent";

type PayableMonthCardProps = {
  month: string;
  platformMap: Map<string, CreditRow>;
  totals: { paid: number; remaining: number };
  onOpenMonthActionsSheet: (month: string) => void;
  onOpenEntryActions: (target: PayableEntryTarget, closeMonthDetail?: boolean) => void;
};

export function PayableMonthCard({
  month,
  platformMap,
  totals,
  onOpenMonthActionsSheet,
  onOpenEntryActions,
}: PayableMonthCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={() => onOpenMonthActionsSheet(month)}>
      <Card variant="section" style={{ padding: 12, gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 16, color: colors.text }}>
            {formatMonthLabel(month)}
          </Text>
        </View>

        <PayableMonthContent
          month={month}
          platformMap={platformMap}
          totals={totals}
          context="card"
          onOpenEntryActions={onOpenEntryActions}
        />
      </Card>
    </Pressable>
  );
}
