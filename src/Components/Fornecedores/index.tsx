import React, { useEffect, useState } from "react";
import { Alert, ActivityIndicator, View } from "react-native";
import { SupplierForm } from "./SupplierForm";
import { SuppliersList } from "./SuppliersList";
import { SupplierProfile } from "./SupplierProfile";
import { SuppliersReports } from "./SuppliersReports";
import { useSuppliers } from "../../contexts/SuppliersContext";
import { Fornecedor } from "../../domains/fornecedores/types";

type ViewType = "lista" | "formulario" | "perfil" | "relatorios";

export function FornecedoresScreen() {
  const { fornecedores, isLoading, loadFornecedores } = useSuppliers();

  const [currentView, setCurrentView] = useState<ViewType>("lista");
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(
    null,
  );
  const [viewingFornecedorId, setViewingFornecedorId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadFornecedores().catch((error) => {
      console.error(
        "[FornecedoresScreen] Erro ao carregar fornecedores:",
        error,
      );
      Alert.alert("Erro", "Não foi possível carregar fornecedores");
    });
  }, [loadFornecedores]);

  const handleAddNew = () => {
    setEditingFornecedor(null);
    setCurrentView("formulario");
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setCurrentView("formulario");
  };

  const handleProfile = (fornecedor: Fornecedor) => {
    setViewingFornecedorId(fornecedor.id);
    setCurrentView("perfil");
  };

  if (currentView === "formulario") {
    return (
      <SupplierForm
        fornecedor={editingFornecedor || undefined}
        onSuccess={() => {
          setCurrentView("lista");
          setEditingFornecedor(null);
        }}
        onCancel={() => {
          setCurrentView("lista");
          setEditingFornecedor(null);
        }}
      />
    );
  }

  if (currentView === "perfil" && viewingFornecedorId) {
    return (
      <SupplierProfile
        fornecedorId={viewingFornecedorId}
        onBack={() => {
          setCurrentView("lista");
          setViewingFornecedorId(null);
        }}
        onEdit={(fornecedor) => {
          setEditingFornecedor(fornecedor);
          setCurrentView("formulario");
        }}
      />
    );
  }

  if (currentView === "relatorios") {
    return (
      <SuppliersReports
        fornecedores={fornecedores}
        onBack={() => setCurrentView("lista")}
      />
    );
  }

  if (isLoading && fornecedores.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SuppliersList
      fornecedores={fornecedores}
      isLoading={isLoading}
      onAddNew={handleAddNew}
      onEdit={handleProfile}
      onOpenReports={() => setCurrentView("relatorios")}
    />
  );
}
