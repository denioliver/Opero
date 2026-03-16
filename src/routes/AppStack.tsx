import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Home } from "../Components/Home";

const Stack = createStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={Home}
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  );
}
