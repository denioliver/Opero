import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Login } from "../Components/Login";

const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={Login}
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  );
}
