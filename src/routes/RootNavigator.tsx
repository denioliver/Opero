import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import AuthStack from "./AuthStack";
import CompanyRegisterStack from "./CompanyRegisterStack";
import AppStack from "./AppStack";
import AdminStack from "./AdminStack";

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
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

  // Se é admin, exibe AdminStack
  if (user?.role === "admin") {
    return <AdminStack />;
  }

  // Se usuário está logado mas não tem perfil global criado ainda, vai para criar empresa/perfil
  if (user?.necessarioCriarPerfil) {
    return <CompanyRegisterStack />;
  }

  // Se é usuário comum (proprietário) e não tem empresa
  if (!company) {
    return <CompanyRegisterStack />;
  }

  return <AppStack />;
}
