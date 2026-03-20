/**
 * AdminStack.tsx
 * Stack de navegação para administradores
 */

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { AdminDashboard } from "../Components/AdminDashboard";

const Stack = createStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
    </Stack.Navigator>
  );
}
