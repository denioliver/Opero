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
import { useCompany } from "../../contexts/CompanyContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Dashboard: undefined;
  ClientsList: undefined;
  ProductsList: undefined;
  OrdersList: undefined;
  InvoicesList: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export const Home: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const { company } = useCompany();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      // Navegação acontece automaticamente no App.tsx
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
      setLoggingOut(false);
    }
  };

  const menuItems = [
    {
      id: 'clients',
      icon: '👥',
      label: 'Clientes',
      onPress: () => navigation.navigate('ClientsList' as keyof RootStackParamList),
    },
    {
      id: 'products',
      icon: '📦',
      label: 'Produtos',
      onPress: () => navigation.navigate('ProductsList' as keyof RootStackParamList),
    },
    {
      id: 'orders',
      icon: '📋',
      label: 'Ordens de Serviço',
      onPress: () => navigation.navigate('OrdersList' as keyof RootStackParamList),
    },
    {
      id: 'invoices',
      icon: '🧾',
      label: 'Notas Fiscais',
      onPress: () => navigation.navigate('InvoicesList' as keyof RootStackParamList),
    },
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
          <Text style={styles.subtitle}>{company?.name || 'Sua Empresa'}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.logoutButtonHeader,
            (loggingOut || isLoading) && styles.logoutButtonDisabled,
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
          <Text style={styles.userName}>{user?.email}</Text>
          {company && (
            <View style={styles.companyInfoContainer}>
              <Text style={styles.infLabel}>Empresa:</Text>
              <Text style={styles.infValue}>{company.name}</Text>
              <Text style={styles.infValue} style={{ color: '#9CA3AF', marginTop: 4 }}>
                {company.city}, {company.state}
              </Text>
            </View>
          )}
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

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.menuSectionTitle}>Status</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="📋"
              label="Ordens"
              value="0"
              color="#06B6D4"
            />
            <StatCard
              icon="👥"
              label="Clientes"
              value="0"
              color="#EC4899"
            />
            <StatCard
              icon="📦"
              label="Produtos"
              value="0"
              color="#F59E0B"
            />
            <StatCard
              icon="🧾"
              label="NFs"
              value="0"
              color="#8B5CF6"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statIcon, { color }]}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
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
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  companyInfoContainer: {
    paddingTop: 12,
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
    marginBottom: 24,
  },
  statsSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  menuItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 13,
    color: "#1F2937",
    textAlign: "center",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});
