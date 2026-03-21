import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { OrdersList } from "./OrdersList";
import { ServiceOrder } from "../../types";
import { useOrders } from "../../contexts/OrdersContext";
import { useClients } from "../../contexts/ClientsContext";
import { useProducts } from "../../contexts/ProductsContext";
import { useCompany } from "../../contexts/CompanyContext";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import {
  formatCurrencyBRL,
  formatCurrencyInput,
  parseCurrencyInput,
} from "../../utils/formatters";

type OrderItemForm = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
};

function currency(value: number) {
  return formatCurrencyBRL(value);
}

function toNumber(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toCurrencyNumber(value: string) {
  if (!value) return 0;
  if (value.includes(",")) {
    return parseCurrencyInput(value);
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const serial = String(now.getTime()).slice(-6);
  return `OS-${year}-${serial}`;
}

function OrderForm({
  order,
  onSuccess,
  onCancel,
}: {
  order?: ServiceOrder;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { addOrder, updateOrder, isLoadingOrders } = useOrders();
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const { clientes, loadClientes, isLoading: isLoadingClientes } = useClients();
  const { products, loadProducts, isLoadingProducts } = useProducts();
  const canWrite = !funcionario?.readOnlyAccess;

  const [selectedClientId, setSelectedClientId] = useState(
    order?.clientId || "",
  );
  const [status, setStatus] = useState<ServiceOrder["status"]>(
    order?.status || "aberto",
  );
  const [sellerName, setSellerName] = useState(
    order?.sellerName || user?.name || "",
  );
  const [sellerId, setSellerId] = useState(order?.sellerId || user?.id || "");
  const [discountInput, setDiscountInput] = useState(
    formatCurrencyInput(
      String(Math.round(((order?.discount || 0) as number) * 100)),
    ),
  );
  const [observations, setObservations] = useState(order?.observations || "");
  const [items, setItems] = useState<OrderItemForm[]>(
    order?.items?.map((item) => ({
      id: item.itemId || `${Date.now()}-${Math.random()}`,
      productId: item.productId,
      productName: item.productName || "",
      quantity: String(item.quantity || 1),
      unitPrice: formatCurrencyInput(
        String(Math.round((item.unitPrice || 0) * 100)),
      ),
    })) || [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnitPrice, setNewUnitPrice] = useState("0,00");

  useEffect(() => {
    Promise.all([loadClientes(), loadProducts()]).catch((error) => {
      console.error("[OrderForm] Erro ao carregar bases:", error);
    });
  }, [loadClientes, loadProducts]);

  const selectedClient = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedClientId),
    [clientes, selectedClientId],
  );

  const selectableClientes = useMemo(
    () => clientes.filter((cliente) => cliente.status !== "inativo"),
    [clientes],
  );

  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = toNumber(item.quantity);
      const unitPrice = toCurrencyNumber(item.unitPrice);
      return sum + quantity * unitPrice;
    }, 0);
  }, [items]);

  const discountValue = useMemo(
    () => toCurrencyNumber(discountInput || "0,00"),
    [discountInput],
  );

  const finalTotal = useMemo(
    () => Math.max(0, totalValue - discountValue),
    [totalValue, discountValue],
  );

  const handleAddItem = () => {
    const product = products.find((item) => item.productId === newProductId);
    if (!product) {
      Alert.alert("Item", "Selecione um produto/serviço.");
      return;
    }

    const quantity = toNumber(newQuantity);
    const unitPrice = toCurrencyNumber(newUnitPrice || "0,00");
    if (quantity <= 0) {
      Alert.alert("Item", "Quantidade deve ser maior que zero.");
      return;
    }
    if (unitPrice <= 0) {
      Alert.alert("Item", "Valor unitário deve ser maior que zero.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.productId,
        productName: product.name,
        quantity: String(quantity),
        unitPrice: formatCurrencyInput(String(Math.round(unitPrice * 100))),
      },
    ]);

    setNewProductId("");
    setNewQuantity("1");
    setNewUnitPrice("0,00");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!canWrite) {
      Alert.alert(
        "Acesso",
        "Este perfil possui apenas permissão de visualização.",
      );
      return;
    }

    if (!selectedClientId) {
      Alert.alert("Validação", "Selecione um cliente.");
      return;
    }

    if (!sellerName.trim()) {
      Alert.alert("Validação", "Informe o vendedor responsável.");
      return;
    }

    if (!selectedClient || selectedClient.status === "bloqueado") {
      Alert.alert("Validação", "Cliente bloqueado não pode receber pedidos.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Validação", "Adicione ao menos um item.");
      return;
    }

    const parsedItems = items.map((item) => {
      const quantity = toNumber(item.quantity);
      const unitPrice = toCurrencyNumber(item.unitPrice);
      return {
        itemId: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
      };
    });

    const orderPayload = {
      companyId: order?.companyId || company?.companyId || "",
      orderNumber: order?.orderNumber || buildOrderNumber(),
      clientId: selectedClientId,
      clientName: selectedClient?.nome,
      sellerId,
      sellerName,
      status,
      issueDate: order?.issueDate || new Date(),
      scheduledDate: order?.scheduledDate,
      completionDate: order?.completionDate,
      items: parsedItems,
      subtotal: totalValue,
      discount: discountValue,
      total: finalTotal,
      observations: observations.trim() || undefined,
      totalValue: finalTotal,
    };

    try {
      setIsSubmitting(true);
      if (order) {
        await updateOrder(order.orderId, orderPayload);
      } else {
        await addOrder(orderPayload);
      }

      Alert.alert(
        "Sucesso",
        order ? "Ordem atualizada com sucesso." : "Ordem criada com sucesso.",
        [{ text: "OK", onPress: onSuccess }],
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao salvar ordem.";
      Alert.alert("Erro", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>{order ? "Editar OS" : "Nova OS"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>

          {!canWrite && (
            <View style={styles.readonlyBadge}>
              <Text style={styles.readonlyBadgeText}>
                Modo leitura: dados sensíveis ocultos
              </Text>
            </View>
          )}

          {isLoadingClientes ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <View style={styles.chipsWrap}>
              {selectableClientes.map((cliente) => {
                const selected = selectedClientId === cliente.id;
                return (
                  <TouchableOpacity
                    key={cliente.id}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => canWrite && setSelectedClientId(cliente.id)}
                    disabled={!canWrite}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextActive,
                      ]}
                    >
                      {canWrite ? cliente.nome : "Cliente oculto"}
                      {cliente.status === "bloqueado" ? " (Bloqueado)" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 10 }]}>Vendedor</Text>
          <TextInput
            style={styles.input}
            value={canWrite ? sellerName : "Vendedor oculto"}
            onChangeText={setSellerName}
            placeholder="Nome do vendedor"
            editable={canWrite}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>ID do vendedor</Text>
          <TextInput
            style={styles.input}
            value={canWrite ? sellerId : "ID oculto"}
            onChangeText={setSellerId}
            placeholder="Identificador do vendedor"
            editable={canWrite}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itens da ordem</Text>

          <Text style={styles.label}>Produto/Serviço</Text>
          <View style={styles.chipsWrap}>
            {products.map((product) => {
              const selected = newProductId === product.productId;
              return (
                <TouchableOpacity
                  key={product.productId}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => {
                    if (!canWrite) return;
                    setNewProductId(product.productId);
                    setNewUnitPrice(
                      formatCurrencyInput(
                        String(Math.round((product.unitPrice || 0) * 100)),
                      ),
                    );
                  }}
                  disabled={isLoadingProducts || !canWrite}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextActive]}
                  >
                    {canWrite ? product.name : "Produto oculto"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { marginRight: 8 }]}>
              <Text style={styles.label}>Qtd</Text>
              <TextInput
                style={styles.input}
                value={newQuantity}
                onChangeText={setNewQuantity}
                keyboardType="decimal-pad"
                editable={canWrite}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Valor unitário</Text>
              <TextInput
                style={styles.input}
                value={newUnitPrice}
                onChangeText={(text) =>
                  setNewUnitPrice(formatCurrencyInput(text))
                }
                placeholder="0,00"
                keyboardType="decimal-pad"
                editable={canWrite}
              />
            </View>
          </View>

          {canWrite && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleAddItem}
            >
              <Text style={styles.secondaryButtonText}>Adicionar item</Text>
            </TouchableOpacity>
          )}

          {items.map((item) => {
            const subtotal =
              toNumber(item.quantity) * toCurrencyNumber(item.unitPrice);
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {canWrite ? item.productName : "Produto oculto"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {canWrite
                      ? `${item.quantity} x ${currency(toCurrencyNumber(item.unitPrice))}`
                      : "Dados ocultos"}
                  </Text>
                </View>
                <Text style={styles.itemValue}>
                  {canWrite ? currency(subtotal) : "Valor oculto"}
                </Text>
                {canWrite && (
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Text style={styles.removeText}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo</Text>

          <View style={styles.inlineRow}>
            <Text style={styles.rowLabel}>Total bruto</Text>
            <Text style={styles.rowValue}>
              {canWrite ? currency(totalValue) : "Valor oculto"}
            </Text>
          </View>

          <Text style={styles.label}>Desconto</Text>
          {canWrite ? (
            <TextInput
              style={styles.input}
              value={discountInput}
              onChangeText={(text) =>
                setDiscountInput(formatCurrencyInput(text))
              }
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
          ) : (
            <View style={[styles.input, styles.inputReadonly]}>
              <Text style={styles.readonlyInputText}>Valor oculto</Text>
            </View>
          )}

          <View style={styles.inlineRow}>
            <Text style={styles.rowLabel}>Total final</Text>
            <Text style={styles.rowValue}>
              {canWrite ? currency(finalTotal) : "Valor oculto"}
            </Text>
          </View>

          <Text style={styles.helperText}>
            O total é calculado automaticamente com base nos itens e desconto.
          </Text>

          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={
              canWrite
                ? observations
                : observations
                  ? "Observação registrada"
                  : "—"
            }
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Observações da ordem"
            editable={canWrite}
          />
        </View>
      </ScrollView>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        {canWrite && (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isSubmitting || isLoadingOrders) && styles.disabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isLoadingOrders}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar OS</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function OrdersScreen() {
  const { funcionario } = useFuncionario();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canWrite = !funcionario?.readOnlyAccess;

  if (showForm) {
    return (
      <OrderForm
        order={selectedOrder || undefined}
        onSuccess={() => {
          setShowForm(false);
          setSelectedOrder(null);
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedOrder(null);
        }}
      />
    );
  }

  return (
    <OrdersList
      onSelectOrder={(order) => {
        setSelectedOrder(order);
        setShowForm(true);
      }}
      onAddNew={() => {
        if (!canWrite) {
          Alert.alert(
            "Acesso",
            "Este perfil possui apenas permissão de visualização.",
          );
          return;
        }
        setSelectedOrder(null);
        setShowForm(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  formHeader: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 38,
    paddingBottom: 12,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  formContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  chipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    marginTop: 10,
  },
  inputGroup: {
    flex: 0.5,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  inputReadonly: {
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
  },
  readonlyInputText: {
    fontSize: 13,
    color: "#6B7280",
  },
  readonlyBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  readonlyBadgeText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  itemRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  removeText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  textArea: {
    minHeight: 90,
  },
  footerActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primaryButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
