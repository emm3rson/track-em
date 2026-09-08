import React from "react";
import { View } from "react-native";

import { RefreshIconButton } from "../../../../components/RefreshIconButton";
import { Text } from "../../../../components/Themed";
import { ENABLE_MANUAL_REFRESH } from "../../../../config/flags";
import { useTheme } from "../../../../theme/ThemeProvider";

type AccountsHeaderProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function AccountsHeader({ onRefresh, refreshing }: AccountsHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Accounts</Text>
        <Text style={{ color: colors.mutedText }}>Manage your cash, savings, and investments</Text>
      </View>
      {ENABLE_MANUAL_REFRESH && onRefresh ? (
        <RefreshIconButton onPress={onRefresh} disabled={refreshing} />
      ) : null}
    </View>
  );
}
