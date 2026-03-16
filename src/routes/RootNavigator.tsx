import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import AuthStack from "./AuthStack";
import CompanyRegisterStack from "./CompanyRegisterStack";
import AppStack from "./AppStack";

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { company, isLoadingCompany } = useCompany();

  if (isLoading || isLoadingCompany) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>Carregando...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  if (!company) {
    return <CompanyRegisterStack />;
  }

  return <AppStack />;
}
