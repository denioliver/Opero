/**
 * Tela Principal de Clientes - Gerencia lista e formulário
 */

import React, { useState, useEffect } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { ClientsList } from "./ClientsList";
import { ClientForm } from "./ClientForm";
import { ClientProfile } from "./ClientProfile";
import { useClients } from "../../contexts/ClientsContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { Cliente } from "../../domains/clientes/types";

type ViewType = "lista" | "formulario" | "perfil";

export function ClientsScreen() {
  const { loadClientes, isLoading, error, clientes } = useClients();
  const { funcionario } = useFuncionario();
  const canWrite = !funcionario?.readOnlyAccess;
  const [currentView, setCurrentView] = useState<ViewType>("lista");
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingClienteId, setViewingClienteId] = useState<string | null>(null);

  // Carrega clientes quando tela monta
  useEffect(() => {
    loadClientes().catch((err) => {
      console.error("[ClientsScreen] Erro ao carregar:", err);
      Alert.alert("Erro", "Não foi possível carregar os clientes");
    });
  }, [loadClientes]);

  const handleAddNew = () => {
    if (!canWrite) {
      Alert.alert(
        "Acesso somente visualização",
        "Seu perfil permite apenas consultar os dados.",
      );
      return;
    }
    setEditingCliente(null);
    setCurrentView("formulario");
  };

  const handleEditCliente = (cliente: Cliente) => {
    if (!canWrite) {
      setViewingClienteId(cliente.id);
      setCurrentView("perfil");
      return;
    }
    setEditingCliente(cliente);
    setCurrentView("formulario");
  };

  const handleFormSuccess = () => {
    setCurrentView("lista");
    setEditingCliente(null);
  };

  const handleFormCancel = () => {
    setCurrentView("lista");
    setEditingCliente(null);
  };

  const handleBackFromProfile = () => {
    setCurrentView("lista");
    setViewingClienteId(null);
  };

  if (currentView === "formulario") {
    return (
      <ClientForm
        cliente={editingCliente || undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  if (currentView === "perfil" && viewingClienteId) {
    return (
      <ClientProfile
        clienteId={viewingClienteId}
        onBack={handleBackFromProfile}
        onEdit={handleEditCliente}
      />
    );
  }

  if (isLoading && clientes.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ClientsList
      clientes={clientes}
      isLoading={isLoading}
      onAddCliente={handleAddNew}
      onEditCliente={handleEditCliente}
      canWrite={canWrite}
    />
  );
}
