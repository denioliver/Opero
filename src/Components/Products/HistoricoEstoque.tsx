/**
 * Componente de Histórico de Movimentação de Estoque
 */

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { useProducts } from "../../contexts/ProductsContext";
import { MovimentacaoEstoque } from "../../domains/produtos/movimentacao";

const windowWidth = Dimensions.get("window").width;

interface HistoricoEstoqueProps {
  productId: string;
  productName: string;
}

export function HistoricoEstoque({
  productId,
  productName,
}: HistoricoEstoqueProps) {
  const { historicoMovimentacao, isLoadingHistorico, obterHistorico } =
    useProducts();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMovimento, setSelectedMovimento] =
    useState<MovimentacaoEstoque | null>(null);

  React.useEffect(() => {
    carregarHistorico();
  }, [productId]);

  const carregarHistorico = async () => {
    try {
      await obterHistorico(productId);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "entrada_compra":
        return "#10B981";
      case "saida_venda":
        return "#3B82F6";
      case "devolucao_cliente":
        return "#8B5CF6";
      case "devolucao_fornecedor":
        return "#F59E0B";
      case "ajuste_manual":
        return "#6B7280";
      case "inventario":
        return "#EC4899";
      default:
        return "#6B7280";
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada_compra: "Entrada (Compra)",
      saida_venda: "Saída (Venda)",
      devolucao_cliente: "Devolução Cliente",
      devolucao_fornecedor: "Devolução Fornecedor",
      ajuste_manual: "Ajuste Manual",
      inventario: "Inventário",
    };
    return labels[tipo] || tipo;
  };

  const renderMovimento = ({ item }: { item: MovimentacaoEstoque }) => (
    <TouchableOpacity
      style={styles.movimentoCard}
      onPress={() => {
        setSelectedMovimento(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.movimentoLeft}>
        <View
          style={[
            styles.movimentoIcon,
            { backgroundColor: getTipoColor(item.tipo) },
          ]}
        >
          <Text style={styles.iconText}>
            {item.tipo.startsWith("entrada") ? "📥" : "📤"}
          </Text>
        </View>
        <View style={styles.movimentoInfo}>
          <Text style={styles.movimentoTipo}>{getTipoLabel(item.tipo)}</Text>
          <Text style={styles.movimentoData}>
            {new Date(
              item.data instanceof Date ? item.data : new Date(item.data),
            ).toLocaleDateString("pt-BR")}
          </Text>
        </View>
      </View>
      <View style={styles.movimentoRight}>
        <Text
          style={[
            styles.movimentoQtd,
            {
              color: item.tipo.startsWith("entrada") ? "#10B981" : "#DC2626",
            },
          ]}
        >
          {item.tipo.startsWith("entrada") ? "+" : "-"}
          {item.quantidade}
        </Text>
        <Text style={styles.movimentoSaldo}>{item.saldoAtual}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Histórico de Movimentação</Text>
          <TouchableOpacity
            onPress={carregarHistorico}
            disabled={isLoadingHistorico}
          >
            <Text style={styles.reloadButton}>🔄</Text>
          </TouchableOpacity>
        </View>

        {isLoadingHistorico ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : historicoMovimentacao.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              Nenhuma movimentação registrada
            </Text>
          </View>
        ) : (
          <FlatList
            data={historicoMovimentacao}
            renderItem={renderMovimento}
            keyExtractor={(item) => item.movimentacaoId}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Modal de Detalhes */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Movimentação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedMovimento && (
                <>
                  <DetailRow
                    label="Tipo"
                    value={getTipoLabel(selectedMovimento.tipo)}
                  />
                  <DetailRow
                    label="Quantidade"
                    value={String(selectedMovimento.quantidade)}
                  />
                  <DetailRow
                    label="Saldo Anterior"
                    value={String(selectedMovimento.saldoAnterior)}
                  />
                  <DetailRow
                    label="Saldo Atual"
                    value={String(selectedMovimento.saldoAtual)}
                  />
                  <DetailRow
                    label="Data"
                    value={new Date(
                      selectedMovimento.data instanceof Date
                        ? selectedMovimento.data
                        : new Date(selectedMovimento.data),
                    ).toLocaleDateString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />

                  {selectedMovimento.descricao && (
                    <DetailRow
                      label="Descrição"
                      value={selectedMovimento.descricao}
                    />
                  )}

                  {selectedMovimento.clienteId && (
                    <DetailRow
                      label="Cliente"
                      value={selectedMovimento.clienteId}
                    />
                  )}

                  {selectedMovimento.fornecedorId && (
                    <DetailRow
                      label="Fornecedor"
                      value={selectedMovimento.fornecedorId}
                    />
                  )}

                  {selectedMovimento.observacoes && (
                    <DetailRow
                      label="Observações"
                      value={selectedMovimento.observacoes}
                    />
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButtonFull}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonFullText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centerContainer: {
    minHeight: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  reloadButton: {
    fontSize: 18,
  },
  listContent: {
    gap: 8,
  },
  movimentoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  movimentoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  movimentoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  movimentoInfo: {
    flex: 1,
  },
  movimentoTipo: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  movimentoData: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  movimentoRight: {
    alignItems: "flex-end",
  },
  movimentoQtd: {
    fontSize: 14,
    fontWeight: "700",
  },
  movimentoSaldo: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    fontSize: 28,
    color: "#9CA3AF",
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  detailRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  closeButtonFull: {
    backgroundColor: "#2563EB",
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonFullText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
