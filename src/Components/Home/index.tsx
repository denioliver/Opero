import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { useCompany } from "../../contexts/CompanyContext";
import { useClients } from "../../contexts/ClientsContext";
import { useSuppliers } from "../../contexts/SuppliersContext";
import { useProducts } from "../../contexts/ProductsContext";
import { useOrders } from "../../contexts/OrdersContext";
import { useInvoices } from "../../contexts/InvoicesContext";
import { useReceivables } from "../../contexts/ReceivablesContext";
import { usePayables } from "../../contexts/PayablesContext";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { HomeFeature } from "../../domains/auth/types";

type RootStackParamList = {
  Dashboard: undefined;
  ClientsList: undefined;
  SuppliersList: undefined;
  ProductsList: undefined;
  OrdersList: undefined;
  InvoicesList: undefined;
  Acessos: undefined;
  Relatorios: undefined;
  Configuracoes: undefined;
  ContasReceber: undefined;
  ContasPagar: undefined;
  Alertas: undefined;
  Auditoria:
    | {
        statusKey?: "ordens" | "clientes" | "produtos" | "nfs";
        statusLabel?: string;
      }
    | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export const Home: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const {
    funcionario,
    logoutFuncionario,
    isLoading: funcionarioLoading,
  } = useFuncionario();
  const { company } = useCompany();
  const { clientes, loadClientes } = useClients();
  const { fornecedores, loadFornecedores } = useSuppliers();
  const { products, loadProducts } = useProducts();
  const { orders, loadOrders } = useOrders();
  const { invoices, loadInvoices } = useInvoices();
  const {
    contasReceber,
    loadContasReceber,
    atualizarAtrasos,
    totalAtrasado,
    totalPendente,
  } = useReceivables();
  const {
    contasPagar,
    loadContasPagar,
    atualizarAtrasosPagar,
    totalPendentePagar,
    totalAtrasadoPagar,
  } = usePayables();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoading = authLoading || funcionarioLoading;
  const ownerDisplayName =
    funcionario?.funcionarioNome ||
    company?.ownerName ||
    user?.name ||
    "Proprietário";
  const isProprietario = user?.role === "users";
  const canSeeAdminCards = isProprietario || !!funcionario?.canAccessAdminCards;
  const canSeeFinancialDashboard =
    isProprietario || funcionario?.canAccessFinancialDashboard !== false;
  const canSeeHomeFeature = (feature: HomeFeature) => {
    if (isProprietario) return true;
    return funcionario?.homePermissions?.[feature] !== false;
  };

  const canSeeFaturamentoCard =
    canSeeFinancialDashboard && canSeeHomeFeature("cardFaturamento");
  const canSeeReceberCard =
    canSeeFinancialDashboard && canSeeHomeFeature("cardAReceber");
  const canSeePagarCard =
    canSeeFinancialDashboard && canSeeHomeFeature("cardAPagar");
  const canSeeLucroCard =
    canSeeFinancialDashboard && canSeeHomeFeature("cardLucro");
  const canSeeEstoqueCard =
    canSeeFinancialDashboard && canSeeHomeFeature("cardEstoqueBaixo");
  const canSeeFinancialSection =
    canSeeFaturamentoCard ||
    canSeeReceberCard ||
    canSeePagarCard ||
    canSeeLucroCard ||
    canSeeEstoqueCard;

  useEffect(() => {
    if (!company?.companyId) return;

    Promise.all([
      loadClientes(),
      loadFornecedores(),
      loadProducts(),
      loadOrders(),
      loadInvoices(),
      loadContasReceber(),
      loadContasPagar(),
      atualizarAtrasos(),
      atualizarAtrasosPagar(),
    ]).catch((error) => {
      console.error("[Home] Erro ao carregar indicadores:", error);
    });
  }, [company?.companyId]);

  const canAccessAdminFeature = (
    feature: "acessos" | "auditoria" | "relatorios",
  ) => {
    if (isProprietario) return true;
    if (!funcionario?.canAccessAdminCards) return false;
    if (!funcionario.adminPermissions) return true; // compatibilidade com cadastros antigos
    return !!funcionario.adminPermissions[feature];
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (user) {
        await logout();
      } else {
        await logoutFuncionario();
      }
      // Navegação acontece automaticamente no App.tsx
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
      setLoggingOut(false);
    }
  };

  const menuItems = [
    {
      id: "clients",
      icon: "CLI",
      label: "Clientes",
      onPress: () =>
        navigation.navigate("ClientsList" as keyof RootStackParamList),
    },
    {
      id: "suppliers",
      icon: "FOR",
      label: "Fornecedores",
      onPress: () =>
        navigation.navigate("SuppliersList" as keyof RootStackParamList),
    },
    {
      id: "products",
      icon: "PRD",
      label: "Produtos/Serviços",
      onPress: () =>
        navigation.navigate("ProductsList" as keyof RootStackParamList),
    },
    {
      id: "orders",
      icon: "OS",
      label: "Ordens de Serviço",
      onPress: () =>
        navigation.navigate("OrdersList" as keyof RootStackParamList),
    },
    {
      id: "invoices",
      icon: "NF",
      label: "Notas Fiscais",
      onPress: () =>
        navigation.navigate("InvoicesList" as keyof RootStackParamList),
    },
    {
      id: "settings",
      icon: "CFG",
      label: "Configurações",
      onPress: () =>
        navigation.navigate("Configuracoes" as keyof RootStackParamList),
    },
    {
      id: "receivables",
      icon: "CR",
      label: "Contas a Receber",
      onPress: () =>
        navigation.navigate("ContasReceber" as keyof RootStackParamList),
    },
    {
      id: "payables",
      icon: "CP",
      label: "Contas a Pagar",
      onPress: () =>
        navigation.navigate("ContasPagar" as keyof RootStackParamList),
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.id === "invoices") return canSeeHomeFeature("atalhoNotasFiscais");
    if (item.id === "receivables")
      return canSeeHomeFeature("atalhoContasReceber");
    if (item.id === "payables") return canSeeHomeFeature("atalhoContasPagar");
    return true;
  });

  const adminMenuItems = [
    {
      id: "acessos",
      icon: "ACS",
      label: "Acessos",
      onPress: () => navigation.navigate("Acessos" as keyof RootStackParamList),
    },
    {
      id: "auditoria",
      icon: "HIS",
      label: "Histórico",
      onPress: () =>
        navigation.navigate("Auditoria" as keyof RootStackParamList),
    },
    {
      id: "relatorios",
      icon: "REL",
      label: "Relatórios",
      onPress: () =>
        navigation.navigate("Relatorios" as keyof RootStackParamList),
    },
    {
      id: "alertas",
      icon: "ALR",
      label: "Alertas",
      onPress: () => navigation.navigate("Alertas" as keyof RootStackParamList),
    },
  ];

  const visibleAdminMenuItems = adminMenuItems.filter((item) =>
    canAccessAdminFeature(item.id as any),
  );

  const statusItems = [
    {
      id: "ordens",
      label: "Ordens",
      value: String(orders.length),
    },
    {
      id: "clientes",
      label: "Clientes",
      value: String(clientes.length),
    },
    {
      id: "fornecedores",
      label: "Fornecedores",
      value: String(fornecedores.length),
    },
    {
      id: "produtos",
      label: "Produtos",
      value: String(products.length),
    },
    {
      id: "nfs",
      label: "NFs",
      value: String(invoices.length),
    },
  ];

  const faturamento = invoices
    .filter((item) => item.status === "paga")
    .reduce((sum, item) => sum + (item.totalValue || 0), 0);
  const pagar = totalPendentePagar + totalAtrasadoPagar;
  const receber = totalPendente + totalAtrasado;
  const lucro = faturamento - pagar;
  const estoqueBaixo = products.filter(
    (item) => (item.currentStock || 0) < (item.minimumStock || 0),
  ).length;

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Opero</Text>
          <Text style={styles.subtitle}>Painel de Gestão</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.logoutButtonHeader,
            loggingOut || isLoading ? styles.logoutButtonDisabled : undefined,
          ]}
          onPress={handleLogout}
          disabled={loggingOut || isLoading}
        >
          {loggingOut ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <Text style={styles.logoutButtonHeaderText}>Sair</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Sessão ativa</Text>
          <Text style={styles.userName}>{ownerDisplayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {company && (
            <View style={styles.companyInfoContainer}>
              <Text style={styles.infLabel}>Empresa:</Text>
              <Text style={styles.infValue}>{company.name}</Text>
              <Text style={[styles.infValue, styles.companyLocation]}>
                {company.city}, {company.state}
              </Text>
            </View>
          )}
        </View>

        {/* Status Discreto */}
        <View style={styles.statusInlineSection}>
          <Text style={styles.statusInlineTitle}>Indicadores rápidos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusInlineRow}
          >
            {statusItems.map((item) => (
              <View key={item.id} style={styles.statusInlineItem}>
                <Text style={styles.statusInlineValue}>{item.value}</Text>
                <Text style={styles.statusInlineLabel}>{item.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {canSeeFinancialSection && (
          <View style={styles.financeSection}>
            <Text style={styles.menuSectionTitle}>Dashboard Financeiro</Text>
            <View style={styles.financeGrid}>
              {canSeeFaturamentoCard && (
                <View style={styles.financeCard}>
                  <Text style={styles.financeLabel}>Faturamento</Text>
                  <Text style={styles.financeValue}>
                    R$ {faturamento.toFixed(2)}
                  </Text>
                </View>
              )}
              {canSeeReceberCard && (
                <View style={styles.financeCard}>
                  <Text style={styles.financeLabel}>A Receber</Text>
                  <Text style={styles.financeValue}>
                    R$ {receber.toFixed(2)}
                  </Text>
                </View>
              )}
              {canSeePagarCard && (
                <View style={styles.financeCard}>
                  <Text style={styles.financeLabel}>A Pagar</Text>
                  <Text style={styles.financeValue}>R$ {pagar.toFixed(2)}</Text>
                </View>
              )}
              {canSeeLucroCard && (
                <View style={styles.financeCard}>
                  <Text style={styles.financeLabel}>Lucro</Text>
                  <Text style={styles.financeValue}>R$ {lucro.toFixed(2)}</Text>
                </View>
              )}
              {canSeeEstoqueCard && (
                <View style={styles.financeCardFull}>
                  <Text style={styles.financeLabel}>Estoque baixo</Text>
                  <Text style={styles.financeValue}>
                    {estoqueBaixo} item(ns)
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Menu Grid */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Gerenciamento</Text>
          <View style={styles.menuGrid}>
            {visibleMenuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Admin Menu */}
        {canSeeAdminCards && visibleAdminMenuItems.length > 0 && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Administração</Text>
            <View style={styles.menuGrid}>
              {visibleAdminMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 34,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  logoutButtonHeader: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutButtonHeaderText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 28,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  welcomeText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  companyInfoContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  infLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 4,
  },
  infValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  companyLocation: {
    color: "#9CA3AF",
    marginTop: 2,
  },
  menuSection: {
    marginBottom: 14,
  },
  financeSection: {
    marginBottom: 14,
  },
  financeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  financeCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  financeCardFull: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  financeLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  financeValue: {
    marginTop: 2,
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "700",
  },
  menuSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  statusInlineSection: {
    marginBottom: 10,
  },
  statusInlineTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
  },
  statusInlineRow: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 4,
  },
  statusInlineItem: {
    width: 96,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9,
    paddingVertical: 6,
    alignItems: "center",
  },
  statusInlineValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 16,
  },
  statusInlineLabel: {
    marginTop: 1,
    fontSize: 9,
    color: "#6B7280",
    lineHeight: 12,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 5,
  },
  menuItem: {
    width: "31.8%",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 11,
    marginBottom: 1,
    color: "#4B5563",
    fontWeight: "700",
  },
  menuLabel: {
    fontSize: 10,
    color: "#1F2937",
    textAlign: "center",
    fontWeight: "500",
  },
});
