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

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        style={styles.productContent}
        onPress={() => onSelectProduct?.(item)}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.productMetadata}>
            <Text style={styles.productCategory}>{item.category}</Text>
            <Text style={styles.productUnit}>{item.unit}</Text>
          </View>
          <Text style={styles.productPrice}>{formatPrice(item.unitPrice)}</Text>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

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
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  productContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  productMetadata: {
    flexDirection: "row",
    marginBottom: 6,
  },
  productCategory: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "500",
    marginRight: 8,
  },
  productUnit: {
    fontSize: 12,
    color: "#6B7280",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  arrowIcon: {
    fontSize: 24,
    color: "#D1D5DB",
  },
  productActions: {
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
