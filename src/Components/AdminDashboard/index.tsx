/**
 * AdminDashboard.tsx
 * Tela para administradores gerenciarem todas as empresas
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import {
  listarTodosUsuarios,
  desativarUsuario,
  ativarUsuario,
  deletarUsuario,
} from "../../services/firebase/usuarioService";
import { getCompany } from "../../services/firebase/companyService";
import { UsuarioGlobal } from "../../domains/auth/types";
import { Company } from "../../types";

interface EmpresaItem extends Company {
  proprietario: UsuarioGlobal;
}

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      setIsLoading(true);
      const usuarios = await listarTodosUsuarios();

      // Filtrar apenas usuários do tipo "users" (proprietários)
      const proprietarios = usuarios.filter(
        (u) => u.role === "users" && u.empresaId,
      );

      // Para cada proprietário, buscar dados da empresa
      const empresasComDados: EmpresaItem[] = [];

      for (const proprietario of proprietarios) {
        if (proprietario.empresaId) {
          try {
            const empresa = await getCompany(proprietario.empresaId);
            if (empresa) {
              empresasComDados.push({
                ...empresa,
                proprietario,
              });
            }
          } catch (error) {
            console.log(
              `Erro ao buscar empresa ${proprietario.empresaId}:`,
              error,
            );
          }
        }
      }

      setEmpresas(empresasComDados);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as empresas");
      console.error("[AdminDashboard] Erro ao carregar empresas:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleBloqueio = async (empresa: EmpresaItem) => {
    Alert.alert(
      "Bloquear Empresa",
      `Bloquear "${empresa.name}"?\n\nO proprietário não conseguirá fazer login.`,
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Bloquear",
          onPress: async () => {
            try {
              await desativarUsuario(empresa.proprietario.id);
              await carregarEmpresas();
              Alert.alert("Sucesso", "Empresa bloqueada");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível bloquear a empresa");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleDesbloquei = async (empresa: EmpresaItem) => {
    try {
      await ativarUsuario(empresa.proprietario.id);
      await carregarEmpresas();
      Alert.alert("Sucesso", "Empresa desbloqueada");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível desbloquear a empresa");
    }
  };

  const handleDeletar = async (empresa: EmpresaItem) => {
    Alert.alert(
      "⚠️ Deletar Empresa",
      `Deletar "${empresa.name}"?\n\nEsta ação é permanente!`,
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Deletar",
          onPress: async () => {
            try {
              await deletarUsuario(empresa.proprietario.id);
              await carregarEmpresas();
              Alert.alert("Sucesso", "Empresa deletada");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível deletar a empresa");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Deslogar?", [
      { text: "Cancelar", onPress: () => {} },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Erro", "Erro ao deslogar");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <FlatList
      data={empresas}
      keyExtractor={(item) => item.companyId}
      onRefresh={carregarEmpresas}
      refreshing={refreshing}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>🔐 Dashboard Admin</Text>
              <Text style={styles.subtitle}>Gerenciar todas as empresas</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>

          {/* Info do Admin */}
          <View style={styles.adminInfo}>
            <Text style={styles.adminEmail}>{user?.email}</Text>
            <Text style={styles.adminRole}>👑 Administrador</Text>
          </View>

          {/* Total de Empresas */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{empresas.length}</Text>
              <Text style={styles.statLabel}>Empresas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {empresas.filter((e) => e.proprietario.ativo).length}
              </Text>
              <Text style={styles.statLabel}>Ativas</Text>
            </View>
          </View>

          {empresas.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhuma empresa cadastrada</Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item: empresa }) => (
        <View style={styles.empresaCard}>
          {/* Status Badge */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{empresa.name}</Text>
            <View
              style={[
                styles.statusBadge,
                empresa.proprietario.ativo
                  ? styles.statusAtivo
                  : styles.statusBloqueado,
              ]}
            >
              <Text style={styles.statusText}>
                {empresa.proprietario.ativo ? "🟢 Ativa" : "🔴 Bloqueada"}
              </Text>
            </View>
          </View>

          {/* Dados */}
          <View style={styles.cardContent}>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Proprietário:</Text>
              <Text style={styles.value}>{empresa.ownerName}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>CPF do Proprietário:</Text>
              <Text style={styles.value}>{empresa.ownerDocument}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Email de Acesso:</Text>
              <Text style={styles.value}>{empresa.ownerEmail}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Email da Empresa (CNPJ):</Text>
              <Text style={styles.value}>{empresa.email}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>CNPJ:</Text>
              <Text style={styles.value}>{empresa.cnpj}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Cidade:</Text>
              <Text style={styles.value}>{empresa.city}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Data de Criação:</Text>
              <Text style={styles.value}>
                {empresa.createdAt?.toDate
                  ? new Date(empresa.createdAt.toDate()).toLocaleDateString(
                      "pt-BR",
                    )
                  : new Date(empresa.createdAt).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.btn, styles.btnInfo]}
              onPress={() =>
                Alert.alert(
                  "Detalhes",
                  `${empresa.name}\nCNPJ: ${empresa.cnpj}`,
                )
              }
            >
              <Text style={styles.btnText}>ℹ️ Detalhes</Text>
            </TouchableOpacity>

            {empresa.proprietario.ativo ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnWarning]}
                onPress={() => handleBloqueio(empresa)}
              >
                <Text style={styles.btnText}>🚫 Bloquear</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.btnSuccess]}
                onPress={() => handleDesbloquei(empresa)}
              >
                <Text style={styles.btnText}>✅ Desbloquear</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => handleDeletar(empresa)}
            >
              <Text style={styles.btnText}>🗑️ Deletar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma empresa encontrada</Text>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFB",
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#DBEAFE",
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  adminInfo: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
  },
  adminEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  adminRole: {
    fontSize: 12,
    color: "#1E40AF",
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: "#F3F4F6",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563EB",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  emptyBox: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  empresaCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusAtivo: {
    backgroundColor: "#DCFCE7",
  },
  statusBloqueado: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dataRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    width: 100,
  },
  value: {
    fontSize: 12,
    color: "#1F2937",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  btnInfo: {
    backgroundColor: "#DBEAFE",
  },
  btnWarning: {
    backgroundColor: "#FEF3C7",
  },
  btnSuccess: {
    backgroundColor: "#DCFCE7",
  },
  btnDanger: {
    backgroundColor: "#FEE2E2",
  },
  btnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
  },
});
