import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Dashboard: undefined;
  ClientsList: undefined;
  ProductsList: undefined;
  OrdersList: undefined;
  InvoicesList: undefined;
  Acessos: undefined;
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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoading = authLoading || funcionarioLoading;
  const ownerDisplayName =
    funcionario?.funcionarioNome ||
    company?.ownerName ||
    user?.name ||
    "Proprietário";
  const isProprietario = user?.role === "users";
  const canSeeAdminCards = isProprietario || !!funcionario?.canAccessAdminCards;

  const handleStatusPress = (
    statusKey: "ordens" | "clientes" | "produtos" | "nfs",
    statusLabel: string,
  ) => {
    navigation.navigate("Auditoria", {
      statusKey,
      statusLabel,
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (user) {
        await logout();
      } else {
        logoutFuncionario();
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
      icon: "👥",
      label: "Clientes",
      onPress: () =>
        navigation.navigate("ClientsList" as keyof RootStackParamList),
    },
    {
      id: "products",
      icon: "📦",
      label: "Produtos",
      onPress: () =>
        navigation.navigate("ProductsList" as keyof RootStackParamList),
    },
    {
      id: "orders",
      icon: "📋",
      label: "Ordens de Serviço",
      onPress: () =>
        navigation.navigate("OrdersList" as keyof RootStackParamList),
    },
    {
      id: "invoices",
      icon: "🧾",
      label: "Notas Fiscais",
      onPress: () =>
        navigation.navigate("InvoicesList" as keyof RootStackParamList),
    },
  ];

  const adminMenuItems = [
    {
      id: "acessos",
      icon: "🔑",
      label: "Acessos",
      onPress: () => navigation.navigate("Acessos" as keyof RootStackParamList),
    },
    {
      id: "auditoria",
      icon: "📊",
      label: "Histórico",
      onPress: () =>
        navigation.navigate("Auditoria" as keyof RootStackParamList),
    },
  ];

  const statusItems = [
    { id: "ordens", label: "Ordens", value: "0" },
    { id: "clientes", label: "Clientes", value: "0" },
    { id: "produtos", label: "Produtos", value: "0" },
    { id: "nfs", label: "NFs", value: "0" },
  ];

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
          <Text style={styles.welcomeText}>Bem-vindo! 👋</Text>
          <Text style={styles.userName}>{ownerDisplayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {company && (
            <View style={styles.companyInfoContainer}>
              <Text style={styles.infLabel}>Empresa:</Text>
              <Text style={styles.infValue}>{company.name}</Text>
              <Text
                style={styles.infValue}
                style={{ color: "#9CA3AF", marginTop: 4 }}
              >
                {company.city}, {company.state}
              </Text>
            </View>
          )}
        </View>

        {/* Status Discreto */}
        <View style={styles.statusInlineSection}>
          <Text style={styles.statusInlineTitle}>Status</Text>
          <View style={styles.statusInlineRow}>
            {statusItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.statusInlineItem}
                onPress={() =>
                  handleStatusPress(
                    item.id as "ordens" | "clientes" | "produtos" | "nfs",
                    item.label,
                  )
                }
              >
                <Text style={styles.statusInlineValue}>{item.value}</Text>
                <Text style={styles.statusInlineLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Grid */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Gerenciamento</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
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
        {canSeeAdminCards && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Administração</Text>
            <View style={styles.menuGrid}>
              {adminMenuItems.map((item) => (
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  companyInfoContainer: {
    paddingTop: 10,
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
  menuSection: {
    marginBottom: 18,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  statusInlineSection: {
    marginBottom: 12,
  },
  statusInlineTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
  },
  statusInlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusInlineItem: {
    width: "24%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
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
    fontSize: 10,
    color: "#6B7280",
    lineHeight: 12,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  menuItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  menuLabel: {
    fontSize: 11,
    color: "#1F2937",
    textAlign: "center",
    fontWeight: "500",
  },
});
