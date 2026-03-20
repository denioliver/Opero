/**
 * Componente de Alertas de Estoque
 * Exibe alertas de estoque mínimo, crítico e máximo
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useProducts } from "../../contexts/ProductsContext";
import { AlertaEstoque } from "../../domains/produtos/movimentacao";

const windowWidth = Dimensions.get("window").width;

export function AlertasEstoque() {
  const { alertas, isLoadingAlertas, loadAlertas, marcarAlertaComoLido } =
    useProducts();

  useEffect(() => {
    const carregarAlertas = async () => {
      try {
        await loadAlertas();
      } catch (error) {
        console.error("Erro ao carregar alertas:", error);
      }
    };

    carregarAlertas();
    // Recarregar a cada 30 segundos
    const interval = setInterval(carregarAlertas, 30000);
    return () => clearInterval(interval);
  }, [loadAlertas]);

  const handleMarcarComoLido = async (alertaId: string) => {
    try {
      await marcarAlertaComoLido(alertaId);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o alerta");
    }
  };

  const getAlertColor = (tipo: string, urgencia: string) => {
    if (urgencia === "alta") return "#DC2626";
    if (urgencia === "media") return "#F59E0B";
    return "#10B981";
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case "critico":
        return "🔴";
      case "minimo":
        return "🟡";
      case "maximo":
        return "🟢";
      default:
        return "📦";
    }
  };

  const getUrgencyBadgeStyle = (urgencia: string) => {
    const baseStyle: any = {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 10,
      fontWeight: "600",
    };

    if (urgencia === "alta") {
      return { ...baseStyle, backgroundColor: "#FEE2E2", color: "#991B1B" };
    } else if (urgencia === "media") {
      return { ...baseStyle, backgroundColor: "#FEF3C7", color: "#92400E" };
    } else {
      return { ...baseStyle, backgroundColor: "#DCFCE7", color: "#166534" };
    }
  };

  const renderAlerta = ({ item }: { item: AlertaEstoque }) => {
    if (item.lido) return null;

    return (
      <TouchableOpacity
        style={[
          styles.alertCard,
          { borderLeftColor: getAlertColor(item.tipo, item.urgencia) },
        ]}
        onPress={() => handleMarcarComoLido(item.alertaId)}
        activeOpacity={0.7}
      >
        <View style={styles.alertHeader}>
          <Text style={styles.alertIcon}>{getAlertIcon(item.tipo)}</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{item.nomeProduto}</Text>
            <Text style={styles.alertDescription}>{item.descricao}</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handleMarcarComoLido(item.alertaId)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.alertFooter}>
          <Text style={getUrgencyBadgeStyle(item.urgencia)}>
            {item.urgencia.toUpperCase()}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleDateString("pt-BR")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingAlertas) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const alertasNaoLidos = alertas.filter((a) => !a.lido);

  if (alertasNaoLidos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyText}>Nenhum alerta de estoque</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas de Estoque</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{alertasNaoLidos.length}</Text>
        </View>
      </View>

      <FlatList
        data={alertasNaoLidos}
        renderItem={renderAlerta}
        keyExtractor={(item) => item.alertaId}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  badge: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  alertDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  closeButton: {
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  timestamp: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
