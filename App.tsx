import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { CompanyProvider, useCompany } from "./src/contexts/CompanyContext";
import { ClientsProvider } from "./src/contexts/ClientsContext";
import { ProductsProvider } from "./src/contexts/ProductsContext";
import { OrdersProvider } from "./src/contexts/OrdersContext";
import { InvoicesProvider } from "./src/contexts/InvoicesContext";
import { Login } from "./src/Components/Login";
import { CompanyRegister } from "./src/Components/CompanyRegister";
import { Home } from "./src/Components/Home";

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={Login} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { company, isLoadingCompany } = useCompany();
  const [forceShowContent, setForceShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceShowContent(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const shouldShowLoading = (isLoading || isLoadingCompany) && !forceShowContent;

  if (shouldShowLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFB",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        !company ? (
          // Usuário autenticado mas sem empresa - mostrar registro de empresa
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="CompanyRegister"
              component={CompanyRegister}
              options={{
                gestureEnabled: false, // Previne voltar antes de criar empresa
              }}
            />
          </Stack.Navigator>
        ) : (
          // Usuário autenticado com empresa - mostrar dashboard
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Dashboard" component={Home} />
          </Stack.Navigator>
        )
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <ClientsProvider>
          <ProductsProvider>
            <OrdersProvider>
              <InvoicesProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </InvoicesProvider>
            </OrdersProvider>
          </ProductsProvider>
        </ClientsProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}
