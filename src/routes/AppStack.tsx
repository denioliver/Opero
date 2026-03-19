import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Home } from "../Components/Home";
import { ClientsScreen } from "../Components/Clients/index";
import { ProductsScreen } from "../Components/Products/index";
import { OrdersScreen } from "../Components/Orders/index";
import { InvoicesScreen } from "../Components/Invoices/index";
import { AcessosScreen } from "../Components/Acessos/index";
import { AuditoriaScreen } from "../Components/Auditoria/index";
import { RelatoriosScreen } from "../Components/Relatorios";

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
      <Stack.Screen
        name="ClientsList"
        component={ClientsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ProductsList"
        component={ProductsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="OrdersList"
        component={OrdersScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="InvoicesList"
        component={InvoicesScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Acessos"
        component={AcessosScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Auditoria"
        component={AuditoriaScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Relatorios"
        component={RelatoriosScreen}
        options={{ animationEnabled: true }}
      />
    </Stack.Navigator>
  );
}
