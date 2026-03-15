import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";

export const Home: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
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
        <Text style={styles.title}>Opero</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Bem-vindo! 👋</Text>
          <Text style={styles.userName}>{user?.email}</Text>
          <Text style={styles.companyName}>Dashboard</Text>
        </View>

        {/* Menu Rápido */}
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem} disabled>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuLabel}>Ordens de Serviço</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} disabled>
            <Text style={styles.menuIcon}>📦</Text>
            <Text style={styles.menuLabel}>Produtos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} disabled>
            <Text style={styles.menuIcon}>🧾</Text>
            <Text style={styles.menuLabel}>Nota Fiscal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} disabled>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuLabel}>Configurações</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[
          styles.logoutButton,
          (loggingOut || isLoading) && styles.logoutButtonDisabled,
        ]}
        onPress={handleLogout}
        disabled={loggingOut || isLoading}
        activeOpacity={0.8}
      >
        {loggingOut ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.logoutButtonText}>Sair</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  menuItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    opacity: 0.6,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
