import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Fornecedor } from "../../domains/fornecedores/types";
import { useSuppliers } from "../../contexts/SuppliersContext";

interface SuppliersListProps {
  fornecedores: Fornecedor[];
  isLoading: boolean;
  onAddNew: () => void;
  onEdit: (fornecedor: Fornecedor) => void;
  onOpenReports: () => void;
}

export function SuppliersList({
  fornecedores,
  isLoading,
  onAddNew,
  onEdit,
  onOpenReports,
}: SuppliersListProps) {
  const { deleteFornecedor, updateFornecedor } = useSuppliers();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "bloqueado" | "inativo"
  >("ativo");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return fornecedores.filter((fornecedor) => {
      const matchesSearch =
        fornecedor.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        fornecedor.cpfCnpj.includes(searchText);

      const matchesStatus =
        statusFilter === "todos" || fornecedor.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [fornecedores, searchText, statusFilter]);

  const handleArchive = (fornecedor: Fornecedor) => {
    Alert.alert(
      "Arquivar fornecedor",
      `Deseja arquivar "${fornecedor.nome}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Arquivar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoadingId(fornecedor.id);
              await deleteFornecedor(fornecedor.id);
              Alert.alert("Sucesso", "Fornecedor arquivado com sucesso");
            } catch (error) {
              const msg =
                error instanceof Error
                  ? error.message
                  : "Erro ao arquivar fornecedor";
              Alert.alert("Erro", msg);
            } finally {
              setLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const handleToggleBlock = (fornecedor: Fornecedor) => {
    const toStatus = fornecedor.status === "bloqueado" ? "ativo" : "bloqueado";
    const label = toStatus === "bloqueado" ? "bloquear" : "desbloquear";

    Alert.alert(
      "Status do fornecedor",
      `Deseja ${label} "${fornecedor.nome}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: toStatus === "bloqueado" ? "Bloquear" : "Desbloquear",
          style: toStatus === "bloqueado" ? "destructive" : "default",
          onPress: async () => {
            try {
              setLoadingId(fornecedor.id);
              await updateFornecedor(fornecedor.id, { status: toStatus });
              Alert.alert("Sucesso", "Status atualizado");
            } catch (error) {
              const msg =
                error instanceof Error
                  ? error.message
                  : "Erro ao atualizar status";
              Alert.alert("Erro", msg);
            } finally {
              setLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Fornecedor }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} onPress={() => onEdit(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.nome}</Text>
          <Text style={styles.meta}>{item.cpfCnpj}</Text>
          <Text style={styles.meta}>{item.telefone || "Sem telefone"}</Text>
          <Text style={styles.meta}>
            Produtos vinculados: {item.produtosFornecidos?.length || 0}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            item.status === "ativo"
              ? styles.badgeAtivo
              : item.status === "bloqueado"
                ? styles.badgeBloqueado
                : styles.badgeInativo,
          ]}
        >
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        {item.status !== "inativo" ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.warningAction]}
            onPress={() => handleToggleBlock(item)}
            disabled={loadingId === item.id}
          >
            {loadingId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionText}>
                {item.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => onEdit(item)}
        >
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerAction]}
          onPress={() => handleArchive(item)}
          disabled={loadingId === item.id}
        >
          {loadingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionText}>Arquivar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fornecedores</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onOpenReports}
          >
            <Text style={styles.secondaryButtonText}>Relatórios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onAddNew}>
            <Text style={styles.primaryButtonText}>+ Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou CPF/CNPJ"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.filters}>
        {(["todos", "ativo", "bloqueado", "inativo"] as const).map((status) => {
          const selected = statusFilter === status;
          const count =
            status === "todos"
              ? fornecedores.length
              : fornecedores.filter((item) => item.status === status).length;

          return (
            <TouchableOpacity
              key={status}
              style={[styles.filter, selected && styles.filterActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[styles.filterText, selected && styles.filterTextActive]}
              >
                {status} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && fornecedores.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum fornecedor encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  header: {
    backgroundColor: "#fff",
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#fff",
  },
  secondaryButtonText: { color: "#374151", fontWeight: "700" },
  searchWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: "#1F2937",
  },
  filters: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  filter: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  filterActive: { borderColor: "#2563EB", backgroundColor: "#DBEAFE" },
  filterText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
  filterTextActive: { color: "#1D4ED8" },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
  },
  name: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 4 },
  meta: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeAtivo: { backgroundColor: "#DCFCE7" },
  badgeBloqueado: { backgroundColor: "#FEF3C7" },
  badgeInativo: { backgroundColor: "#FEE2E2" },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
    textTransform: "capitalize",
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    minHeight: 36,
  },
  primaryAction: { backgroundColor: "#2563EB" },
  warningAction: { backgroundColor: "#D97706" },
  dangerAction: { backgroundColor: "#DC2626" },
  actionText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyText: { color: "#6B7280", fontSize: 15 },
});
