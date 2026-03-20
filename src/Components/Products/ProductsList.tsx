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
import { useProducts } from "../../contexts/ProductsContext";
import { Product } from "../../types";
import { formatCurrencyBRL } from "../../utils/formatters";

interface ProductsListProps {
  onSelectProduct?: (product: Product) => void;
  onAddNew?: () => void;
}

export function ProductsList({ onSelectProduct, onAddNew }: ProductsListProps) {
  const { products, isLoadingProducts, loadProducts, deleteProduct } =
    useProducts();
  const [searchText, setSearchText] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const handleDelete = (productId: string, productName: string) => {
    Alert.alert(
      "Confirmar exclusão",
      `Deseja excluir o produto "${productName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setDeleting(productId);
            try {
              await deleteProduct(productId);
              Alert.alert("Sucesso", "Produto excluído com sucesso");
            } catch (error) {
              Alert.alert("Erro", "Erro ao excluir produto");
            } finally {
              setDeleting(null);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (
    estoqueAtual: number,
    estoqueMinimo: number,
    estoqueMaximo: number,
  ) => {
    if (estoqueAtual === 0) return "#DC2626"; // Crítico
    if (estoqueAtual < estoqueMinimo) return "#F59E0B"; // Baixo
    if (estoqueAtual > estoqueMaximo) return "#3B82F6"; // Excesso
    return "#10B981"; // Normal
  };

  const getStatusLabel = (
    estoqueAtual: number,
    estoqueMinimo: number,
    estoqueMaximo: number,
  ) => {
    if (estoqueAtual === 0) return "Crítico";
    if (estoqueAtual < estoqueMinimo) return "Baixo";
    if (estoqueAtual > estoqueMaximo) return "Excesso";
    return "OK";
  };

  const getMargem = (precoVenda: number, precoCusto?: number) => {
    if (!precoCusto || precoCusto === 0) return 0;
    return ((precoVenda - precoCusto) / precoCusto) * 100;
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const estoqueAtual = item.currentStock || 0;
    const estoqueMinimo = item.minimumStock || 0;
    const estoqueMaximo = item.maximumStock || 0;
    const statusColor = getStatusColor(
      estoqueAtual,
      estoqueMinimo,
      estoqueMaximo,
    );
    const statusLabel = getStatusLabel(
      estoqueAtual,
      estoqueMinimo,
      estoqueMaximo,
    );
    const margem = getMargem(item.unitPrice, item.costPrice);

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.productContent}
          onPress={() => onSelectProduct?.(item)}
        >
          <View style={styles.productLeft}>
            {/* Status Badge */}
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>

            {/* Informações Básicas */}
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.metadataRow}>
              <Text style={styles.metaTag}>{item.category}</Text>
              <Text style={styles.metaTag}>{item.unit}</Text>
              {item.status === "inativo" && (
                <Text style={[styles.metaTag, { backgroundColor: "#FECACA" }]}>
                  Inativo
                </Text>
              )}
            </View>

            {/* Preços e Margem */}
            <View style={styles.priceRow}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Venda</Text>
                <Text style={styles.priceValue}>
                  {formatCurrencyBRL(item.unitPrice)}
                </Text>
              </View>
              {item.costPrice && (
                <View style={styles.priceColumn}>
                  <Text style={styles.priceLabel}>Custo</Text>
                  <Text style={[styles.priceValue, { fontSize: 12 }]}>
                    {formatCurrencyBRL(item.costPrice)}
                  </Text>
                </View>
              )}
              {margem > 0 && (
                <View style={styles.priceColumn}>
                  <Text style={styles.priceLabel}>Margem</Text>
                  <Text style={[styles.priceValue, { color: "#10B981" }]}>
                    {margem.toFixed(0)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Estoque */}
            <View style={styles.estoqueRow}>
              <Text style={styles.estoqueLabel}>
                Estoque: {estoqueAtual} / {estoqueMinimo}-{estoqueMaximo}
              </Text>
              <Text
                style={[
                  styles.estoqueLabel,
                  {
                    color: estoqueAtual < estoqueMinimo ? "#DC2626" : "#10B981",
                  },
                ]}
              >
                {estoqueAtual < estoqueMinimo ? "⚠️" : "✓"}
              </Text>
            </View>
          </View>

          {/* Arrow Icon */}
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => onSelectProduct?.(item)}
          >
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.productId, item.name)}
            disabled={deleting === item.productId}
          >
            {deleting === item.productId ? (
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Produtos e Serviços</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddNew}>
          <Text style={styles.addButtonText}>+ Novo Produto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {isLoadingProducts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText
              ? "Nenhum produto encontrado"
              : "Você ainda não tem produtos cadastrados"}
          </Text>
          {!searchText && (
            <TouchableOpacity style={styles.emptyButton} onPress={onAddNew}>
              <Text style={styles.emptyButtonText}>
                Cadastrar Primeiro Produto
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.productId}
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
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  productContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  productLeft: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  metaTag: {
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  priceColumn: {
    alignItems: "flex-start",
  },
  priceLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    marginTop: 2,
  },
  estoqueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  estoqueLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  arrowIcon: {
    fontSize: 20,
    color: "#D1D5DB",
    marginLeft: 8,
  },
  productActions: {
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
