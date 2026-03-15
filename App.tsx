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
import { ClientsScreen } from "./src/Components/Clients";
import { ProductsScreen } from "./src/Components/Products";
import { OrdersScreen } from "./src/Components/Orders";
import { InvoicesScreen } from "./src/Components/Invoices";

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

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "600",
          color: "#1F2937",
        },
        headerBackTitleVisible: false,
        headerTintColor: "#2563EB",
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={Home}
        options={{
          headerShown: false,
        }}
      />

      {/* Clients */}
      <Stack.Screen
        name="ClientsList"
        component={ClientsScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* Products */}
      <Stack.Screen
        name="ProductsList"
        component={ProductsScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* Orders */}
      <Stack.Screen
        name="OrdersList"
        component={OrdersScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* Invoices */}
      <Stack.Screen
        name="InvoicesList"
        component={InvoicesScreen}
        options={{
          headerShown: false,
        }}
      />
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
          <AppStack />
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
