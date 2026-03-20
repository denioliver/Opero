import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { Home } from "../Components/Home";
import { ClientsScreen } from "../Components/Clients/index";
import { FornecedoresScreen } from "../Components/Fornecedores";
import { ProductsScreen } from "../Components/Products/index";
import { OrdersScreen } from "../Components/Orders/index";
import { InvoicesScreen } from "../Components/Invoices/index";
import { AcessosScreen } from "../Components/Acessos/index";
import { AuditoriaScreen } from "../Components/Auditoria/index";
import { RelatoriosScreen } from "../Components/Relatorios";
import { ConfiguracoesScreen } from "../Components/Configuracoes";

const Stack = createStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={Home} />
      <Stack.Screen name="ClientsList" component={ClientsScreen} />
      <Stack.Screen name="SuppliersList" component={FornecedoresScreen} />
      <Stack.Screen name="ProductsList" component={ProductsScreen} />
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="InvoicesList" component={InvoicesScreen} />
      <Stack.Screen name="Acessos" component={AcessosScreen} />
      <Stack.Screen name="Auditoria" component={AuditoriaScreen} />
      <Stack.Screen name="Relatorios" component={RelatoriosScreen} />
      <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
    </Stack.Navigator>
  );
}
