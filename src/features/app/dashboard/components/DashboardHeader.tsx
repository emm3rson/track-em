import React from "react";
import { Pressable, View } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { UserRoundCog } from "lucide-react-native";

import { Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";

type DashboardHeaderNavigation = NavigationProp<Record<string, object | undefined>>;

export function DashboardHeader() {
  const navigation = useNavigation<DashboardHeaderNavigation>();
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Dashboard</Text>
        <Text style={{ color: colors.mutedText }}>Financial overview</Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate("Settings")}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UserRoundCog size={24} color={colors.icon} />
      </Pressable>
    </View>
  );
}
