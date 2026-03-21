/**
 * Lista Completa de Clientes com Paginação e Filtros
 */

import React, { useState, useMemo } from "react";
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
import { Cliente } from "../../domains/clientes/types";
import { useClients } from "../../contexts/ClientsContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { maskDocument, maskEmail, maskPhone } from "../../utils/privacy";

const ITEMS_PER_PAGE = 10;

interface ClientsListProps {
  clientes: Cliente[];
  isLoading: boolean;
  onAddCliente: () => void;
  onEditCliente: (cliente: Cliente) => void;
  canWrite?: boolean;
}

export function ClientsList({
  clientes,
  isLoading,
  onAddCliente,
  onEditCliente,
  canWrite = true,
}: ClientsListProps) {
  const { deleteCliente, updateCliente, error } = useClients();
  const { funcionario } = useFuncionario();
  const shouldMaskSensitiveData = !!funcionario?.readOnlyAccess;
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "bloqueado" | "inativo"
  >("ativo");
  const [currentPage, setCurrentPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Filtra clientes por busca e status
  const filteredClientes = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchesSearch =
        cliente.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        cliente.documento.includes(searchText);

      const matchesStatus =
        statusFilter === "todos" || cliente.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clientes, searchText, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredClientes.slice(start, end);
  }, [filteredClientes, currentPage]);

  // Reset página ao filtrar
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchText, statusFilter]);

  const handleDelete = (clienteId: string, clienteName: string) => {
    Alert.alert(
      "Confirmar exclusão",
      `Deseja arquivar o cliente "${clienteName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Arquivar",
          style: "destructive",
          onPress: async () => {
            setDeletingId(clienteId);
            try {
              await deleteCliente(clienteId);
              Alert.alert("Sucesso", "Cliente arquivado com sucesso");
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : "Erro ao arquivar cliente";
              Alert.alert("Erro", msg);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleToggleBlock = async (cliente: Cliente) => {
    const toStatus = cliente.status === "bloqueado" ? "ativo" : "bloqueado";
    const actionLabel = toStatus === "bloqueado" ? "bloquear" : "desbloquear";

    Alert.alert(
      "Status do cliente",
      `Deseja ${actionLabel} o cliente "${cliente.nome}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: toStatus === "bloqueado" ? "Bloquear" : "Desbloquear",
          style: toStatus === "bloqueado" ? "destructive" : "default",
          onPress: async () => {
            try {
              setUpdatingStatusId(cliente.id);
              await updateCliente(cliente.id, { status: toStatus });
              Alert.alert(
                "Sucesso",
                toStatus === "bloqueado"
                  ? "Cliente bloqueado com sucesso"
                  : "Cliente desbloqueado com sucesso",
              );
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : "Erro ao atualizar status";
              Alert.alert("Erro", msg);
            } finally {
              setUpdatingStatusId(null);
            }
          },
        },
      ],
    );
  };

  const getStatusLabel = (
    status: "ativo" | "bloqueado" | "inativo",
  ): string => {
    if (status === "ativo") return "Ativo";
    if (status === "bloqueado") return "Bloqueado";
    return "Arquivado";
  };

  const statusColor = (status: "ativo" | "bloqueado" | "inativo"): string => {
    if (status === "ativo") return "#10B981";
    if (status === "bloqueado") return "#D97706";
    return "#EF4444";
  };

  const getDocumentoLabel = (tipo: "pf" | "pj"): string => {
    return tipo === "pf" ? "CPF" : "CNPJ";
  };

  const renderClienteItem = ({ item }: { item: Cliente }) => (
    <View style={styles.clienteCard}>
      <TouchableOpacity
        style={styles.clienteContent}
        onPress={() => onEditCliente(item)}
      >
        <View style={styles.clienteInfo}>
          <Text style={styles.clienteName}>{item.nome}</Text>
          <View style={styles.clienteMetaRow}>
            <Text style={styles.metaLabel}>{getDocumentoLabel(item.tipo)}</Text>
            <Text style={styles.clienteSubtitle}>
              {shouldMaskSensitiveData
                ? maskDocument(item.documento)
                : item.documento}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor(item.status) + "20" },
              ]}
            >
              <Text
                style={[styles.statusText, { color: statusColor(item.status) }]}
              >
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
          <View style={styles.inlineTable}>
            <View style={styles.tableLine}>
              <Text style={styles.tableKey}>Telefone</Text>
              <Text style={styles.tableValue}>
                {shouldMaskSensitiveData
                  ? maskPhone(item.telefone)
                  : item.telefone || "—"}
              </Text>
            </View>
            <View style={styles.tableLine}>
              <Text style={styles.tableKey}>E-mail</Text>
              <Text numberOfLines={1} style={styles.tableValue}>
                {shouldMaskSensitiveData
                  ? maskEmail(item.email)
                  : item.email || "—"}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      {canWrite && (
        <View style={styles.clienteActions}>
          {item.status !== "inativo" && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                item.status === "bloqueado"
                  ? styles.editButton
                  : styles.deleteButton,
              ]}
              onPress={() => handleToggleBlock(item)}
              disabled={updatingStatusId === item.id}
            >
              {updatingStatusId === item.id ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color:
                        item.status === "bloqueado" ? "#2563EB" : "#EF4444",
                    },
                  ]}
                >
                  {item.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => onEditCliente(item)}
          >
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id, item.nome)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={[styles.actionButtonText, { color: "#EF4444" }]}>
                Arquivar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        {canWrite && (
          <TouchableOpacity style={styles.addButton} onPress={onAddCliente}>
            <Text style={styles.addButtonText}>+ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Busca */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou documento"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === "todos" && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter("todos")}
        >
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === "todos" && styles.filterButtonTextActive,
            ]}
          >
            Todos ({filteredClientes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === "ativo" && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter("ativo")}
        >
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === "ativo" && styles.filterButtonTextActive,
            ]}
          >
            Ativos ({clientes.filter((c) => c.status === "ativo").length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === "bloqueado" && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter("bloqueado")}
        >
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === "bloqueado" && styles.filterButtonTextActive,
            ]}
          >
            Bloqueados (
            {clientes.filter((c) => c.status === "bloqueado").length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === "inativo" && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter("inativo")}
        >
          <Text
            style={[
              styles.filterButtonText,
              statusFilter === "inativo" && styles.filterButtonTextActive,
            ]}
          >
            Arquivados ({clientes.filter((c) => c.status === "inativo").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista ou Estado Vazio */}
      {isLoading && clientes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : paginatedClientes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText || statusFilter !== "todos"
              ? "Nenhum cliente encontrado"
              : "Você ainda não tem clientes cadastrados"}
          </Text>
          {!searchText && statusFilter === "todos" && (
            <TouchableOpacity style={styles.emptyButton} onPress={onAddCliente}>
              <Text style={styles.emptyButtonText}>
                Cadastrar Primeiro Cliente
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={paginatedClientes}
            renderItem={renderClienteItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Paginação */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === 0 && styles.paginationButtonDisabled,
                ]}
                onPress={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <Text
                  style={[
                    styles.paginationButtonText,
                    currentPage === 0 && styles.paginationButtonTextDisabled,
                  ]}
                >
                  ← Anterior
                </Text>
              </TouchableOpacity>

              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>
                  Página {currentPage + 1} de {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === totalPages - 1 &&
                    styles.paginationButtonDisabled,
                ]}
                onPress={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
              >
                <Text
                  style={[
                    styles.paginationButtonText,
                    currentPage === totalPages - 1 &&
                      styles.paginationButtonTextDisabled,
                  ]}
                >
                  Próximo →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  addButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5",
  },
  errorText: {
    color: "#DC2626",
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
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#2563EB",
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
  clienteCard: {
    backgroundColor: "#fff",
    borderRadius: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  clienteContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  clienteMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  clienteSubtitle: {
    fontSize: 12,
    color: "#374151",
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inlineTable: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 7,
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
  tableValue: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 8,
    flexShrink: 1,
  },
  arrowIcon: {
    fontSize: 20,
    color: "#D1D5DB",
  },
  clienteActions: {
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
  paginationContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  paginationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  paginationButtonTextDisabled: {
    color: "#9CA3AF",
  },
  paginationInfo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  paginationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
});
