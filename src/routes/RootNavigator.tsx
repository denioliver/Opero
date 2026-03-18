import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useFuncionario } from "../contexts/FuncionarioContext";
import { useCompany } from "../contexts/CompanyContext";
import AuthStack from "./AuthStack";
import CompanyRegisterStack from "./CompanyRegisterStack";
import AppStack from "./AppStack";
import AdminStack from "./AdminStack";

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { funcionario } = useFuncionario();
  const { company, isLoadingCompany } = useCompany();
  const hasFuncionarioSession = !!funcionario;

  // Mostrar loading APENAS se está carregando dados da empresa após autenticar
  // Durante login, o botão já gira - não precisa de tela de loading global
  if (
    (isAuthenticated || hasFuncionarioSession) &&
    isLoadingCompany &&
    !company &&
    !user?.necessarioCriarPerfil
  ) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>Carregando...</Text>
      </View>
    );
  }

  if (!isAuthenticated && !hasFuncionarioSession) {
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
  if (!company && isAuthenticated) {
    return <CompanyRegisterStack />;
  }

  if (hasFuncionarioSession) {
    return <AppStack />;
  }

  return <AppStack />;
}
