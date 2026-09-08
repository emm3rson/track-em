import React from "react";
import { Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import DashboardIcon from "../../../assets/icons/dashboard_alt.svg";
import ExpenseIcon from "../../../assets/icons/expense.svg";
import AccountsIcon from "../../../assets/icons/wallet.svg";
import ObligationsIcon from "../../../assets/icons/obligations.svg";

import { useTheme } from "../../theme/ThemeProvider";
import type { TabParamList } from "../types";
import { useFab } from "../FabContext";
import { CenterFabButton } from "./CenterFabButton";

const TAB_BAR_BASE_HEIGHT = 68;

const TAB_ITEM_VERTICAL_PADDING = 7;

type TabBarProps = BottomTabBarProps;

const TAB_LABELS: Record<keyof TabParamList, string> = {
  Dashboard: "Dashboard",
  Expenses: "Expenses",
  Accounts: "Accounts",
  Obligations: "Obligations",
};

const TAB_ICONS: Record<keyof TabParamList, React.ComponentType<SvgProps>> = {
  Dashboard: DashboardIcon,
  Expenses: ExpenseIcon,
  Accounts: AccountsIcon,
  Obligations: ObligationsIcon,
};

const TAB_ICON_SIZES: Record<keyof TabParamList, number> = {
  Dashboard: 24,
  Expenses: 26,
  Accounts: 26,
  Obligations: 26,
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { openFab } = useFab();
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();

  const renderTab = (index: number) => {
    const route = state.routes[index];
    if (!route) return null;

    const descriptor = descriptors[route.key];
    const isFocused = state.index === index;
    const routeName = route.name as keyof TabParamList;
    const label = TAB_LABELS[routeName] ?? route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    const Icon = TAB_ICONS[routeName];
    const iconSize = TAB_ICON_SIZES[routeName];
    const iconColor = isFocused ? colors.icon : colors.iconMuted;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? label}
        testID={descriptor.options.tabBarButtonTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: TAB_ITEM_VERTICAL_PADDING,
        }}
      >
        {Icon && (
          <Icon width={iconSize} height={iconSize} color={iconColor} style={{ marginBottom: 4 }} />
        )}
        <Text
          style={{
            fontSize: 10,
            fontWeight: isFocused ? "600" : "400",
            color: iconColor,
            fontFamily,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        height: TAB_BAR_BASE_HEIGHT + insets.bottom,
        paddingTop: TAB_ITEM_VERTICAL_PADDING,
        paddingBottom: TAB_ITEM_VERTICAL_PADDING + insets.bottom,
        paddingHorizontal: 20,
        overflow: "visible",
      }}
    >
      {renderTab(0)}
      {renderTab(1)}
      <CenterFabButton onPress={openFab} />
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}
