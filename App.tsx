import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { FuncionarioProvider } from "./src/contexts/FuncionarioContext";
import { CompanyProvider } from "./src/contexts/CompanyContext";
import { ClientsProvider } from "./src/contexts/ClientsContext";
import { SuppliersProvider } from "./src/contexts/SuppliersContext";
import { ProductsProvider } from "./src/contexts/ProductsContext";
import { OrdersProvider } from "./src/contexts/OrdersContext";
import { InvoicesProvider } from "./src/contexts/InvoicesContext";
import RootNavigator from "./src/routes/RootNavigator";

export default function App() {
  return (
    <AuthProvider>
      <FuncionarioProvider>
        <CompanyProvider>
          <SuppliersProvider>
            <ClientsProvider>
              <ProductsProvider>
                <OrdersProvider>
                  <InvoicesProvider>
                    <NavigationContainer>
                      <RootNavigator />
                    </NavigationContainer>
                  </InvoicesProvider>
                </OrdersProvider>
              </ProductsProvider>
            </ClientsProvider>
          </SuppliersProvider>
        </CompanyProvider>
      </FuncionarioProvider>
    </AuthProvider>
  );
}
