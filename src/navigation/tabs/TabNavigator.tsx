import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { AccountsScreen } from "../../features/app/accounts/screens/AccountsScreen";
import { DashboardScreen } from "../../features/app/dashboard/screens/DashboardScreen";
import { ExpensesScreen } from "../../features/app/expenses/screens/ExpensesScreen";
import { ObligationsScreen } from "../../features/app/obligations/screens/ObligationsScreen";
import type { TabParamList } from "../types";
import { TabBar } from "./TabBar";

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Expenses" component={ExpensesScreen} />
        <Tab.Screen name="Accounts" component={AccountsScreen} />
        <Tab.Screen name="Obligations" component={ObligationsScreen} />
      </Tab.Navigator>
    </View>
  );
}
