import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { CompanyRegister } from "../Components/CompanyRegister";

const Stack = createStackNavigator();

export default function CompanyRegisterStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="CompanyRegister"
        component={CompanyRegister}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
