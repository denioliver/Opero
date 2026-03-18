import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useOrders } from "../../contexts/OrdersContext";
import { ServiceOrder, OrderStatus } from "../../types";

interface OrdersListProps {
  onSelectOrder?: (order: ServiceOrder) => void;
  onAddNew?: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  rascunho: "Rascunho",
  confirmada: "Confirmada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  faturada: "Faturada",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  rascunho: "#9CA3AF",
  confirmada: "#3B82F6",
  em_andamento: "#F59E0B",
  concluida: "#10B981",
  faturada: "#8B5CF6",
};

export function OrdersList({ onSelectOrder, onAddNew }: OrdersListProps) {
  const { orders, isLoadingOrders, loadOrders, deleteOrder } = useOrders();
  const [searchText, setSearchText] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      (order.clientName &&
        order.clientName.toLowerCase().includes(searchText.toLowerCase())),
  );

  const handleDelete = (orderId: string, orderNumber: string) => {
    Alert.alert(
      "Confirmar exclusão",
      `Deseja excluir a ordem ${orderNumber}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setDeleting(orderId);
            try {
              await deleteOrder(orderId);
              Alert.alert("Sucesso", "Ordem excluída com sucesso");
            } catch (error) {
              Alert.alert("Erro", "Erro ao excluir ordem");
            } finally {
              setDeleting(null);
            }
          },
        },
      ],
    );
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  const renderOrderItem = ({ item }: { item: ServiceOrder }) => (
    <View style={styles.orderCard}>
      <TouchableOpacity
        style={styles.orderContent}
        onPress={() => onSelectOrder?.(item)}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Text style={styles.clientName}>
              {item.clientName || "Cliente"}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.itemCount}>
            {item.items.length} item{item.items.length !== 1 ? "ns" : ""}
          </Text>
          <Text style={styles.totalValue}>
            {formatCurrency(item.totalValue)}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onSelectOrder?.(item)}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.orderId, item.orderNumber)}
          disabled={deleting === item.orderId}
        >
          {deleting === item.orderId ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>
              Deletar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ordens de Serviço</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddNew}>
          <Text style={styles.addButtonText}>+ Nova OS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número ou cliente"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {isLoadingOrders ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText
              ? "Nenhuma ordem encontrada"
              : "Você ainda não tem ordens de serviço"}
          </Text>
          {!searchText && (
            <TouchableOpacity style={styles.emptyButton} onPress={onAddNew}>
              <Text style={styles.emptyButtonText}>Criar Primeira Ordem</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.orderId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
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
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  orderContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  itemCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  orderActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F3F4F6",
  },
  editButton: {
    backgroundColor: "#F0F9FF",
  },
  deleteButton: {
    backgroundColor: "#FEF2F2",
    borderRightWidth: 0,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
});
