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
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { ServiceOrder, OrderStatus } from "../../types";
import { formatCurrencyBRL } from "../../utils/formatters";

interface OrdersListProps {
  onSelectOrder?: (order: ServiceOrder) => void;
  onAddNew?: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  aberto: "Aberto",
  faturado: "Faturado",
  cancelado: "Cancelado",
  rascunho: "Rascunho",
  confirmada: "Confirmada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  faturada: "Faturada",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  aberto: "#2563EB",
  faturado: "#7C3AED",
  cancelado: "#DC2626",
  rascunho: "#9CA3AF",
  confirmada: "#3B82F6",
  em_andamento: "#F59E0B",
  concluida: "#10B981",
  faturada: "#8B5CF6",
};

export function OrdersList({ onSelectOrder, onAddNew }: OrdersListProps) {
  const { funcionario } = useFuncionario();
  const { orders, isLoadingOrders, loadOrders, deleteOrder, faturarOrder } =
    useOrders();
  const canWrite = !funcionario?.readOnlyAccess;

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
              {canWrite ? item.clientName || "Cliente" : "Cliente oculto"}
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
          <View style={styles.tableLine}>
            <Text style={styles.tableKey}>Itens</Text>
            <Text style={styles.itemCount}>
              {item.items.length} item{item.items.length !== 1 ? "ns" : ""}
            </Text>
          </View>
          <View style={styles.tableLine}>
            <Text style={styles.tableKey}>Total</Text>
            <Text style={styles.totalValue}>
              {canWrite ? formatCurrencyBRL(item.totalValue) : "Valor oculto"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {canWrite && (
        <View style={styles.orderActions}>
          {(item.status === "aberto" || item.status === "confirmada") && (
            <TouchableOpacity
              style={[styles.actionButton, styles.billButton]}
              onPress={async () => {
                try {
                  await faturarOrder(item.orderId, {
                    parcelas: 1,
                    formaPagamento: "boleto",
                  });
                  Alert.alert("Sucesso", "Pedido faturado com sucesso");
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Erro ao faturar";
                  Alert.alert("Erro", message);
                }
              }}
            >
              <Text style={[styles.actionButtonText, { color: "#7C3AED" }]}>
                Faturar
              </Text>
            </TouchableOpacity>
          )}

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
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ordens de Serviço</Text>
        {!canWrite && (
          <Text style={styles.subtitle}>
            Modo leitura: dados sensíveis ocultos
          </Text>
        )}
        {canWrite && (
          <TouchableOpacity style={styles.addButton} onPress={onAddNew}>
            <Text style={styles.addButtonText}>+ Nova OS</Text>
          </TouchableOpacity>
        )}
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
          {!searchText && canWrite && (
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 12,
    color: "#92400E",
    marginBottom: 12,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  orderContent: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  orderDetails: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  tableLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableKey: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  itemCount: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 12,
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
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#F3F4F6",
  },
  editButton: {
    backgroundColor: "#F0F9FF",
  },
  billButton: {
    backgroundColor: "#F3E8FF",
  },
  deleteButton: {
    backgroundColor: "#FEF2F2",
    borderRightWidth: 0,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
});
