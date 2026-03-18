/**
 * AuditoriaScreen.tsx
 * Visualizar histórico de ações (auditoria)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useCompany } from "../../contexts/CompanyContext";
import { listarAuditoria } from "../../services/firebase/auditoriaService";
import { AuditoriaLog } from "../../domains/auth/types";

export const AuditoriaScreen: React.FC = () => {
  const { company } = useCompany();
  const [auditorias, setAuditorias] = useState<AuditoriaLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterAcao, setFilterAcao] = useState("");

  useEffect(() => {
    if (company) {
      carregarAuditoria();
    }
  }, [company]);

  const carregarAuditoria = async () => {
    if (!company) return;
    try {
      setIsLoading(true);
      const logs = await listarAuditoria(company.companyId, {
        acao: filterAcao || undefined,
      });
      setAuditorias(logs);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar auditoria");
      console.error("[AuditoriaScreen] Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetails = (log: AuditoriaLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedLog(null);
  };

  const formatarData = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionIcon = (acao: string) => {
    const icons: Record<string, string> = {
      criar_cliente: "➕",
      editar_cliente: "✏️",
      deletar_cliente: "🗑️",
      criar_produto: "➕",
      editar_produto: "✏️",
      deletar_produto: "🗑️",
      criar_ordem: "➕",
      editar_ordem: "✏️",
      completar_ordem: "✅",
      criar_funcionario: "➕",
      editar_funcionario: "✏️",
      desativar_funcionario: "🚫",
    };
    return icons[acao] || "📋";
  };

  const getActionLabel = (acao: string) => {
    const labels: Record<string, string> = {
      criar_cliente: "Criou Cliente",
      editar_cliente: "Editou Cliente",
      deletar_cliente: "Deletou Cliente",
      criar_produto: "Criou Produto",
      editar_produto: "Editou Produto",
      deletar_produto: "Deletou Produto",
      criar_ordem: "Criou Ordem",
      editar_ordem: "Editou Ordem",
      completar_ordem: "Completou Ordem",
      criar_funcionario: "Criou Funcionário",
      editar_funcionario: "Editou Funcionário",
      desativar_funcionario: "Desativou Funcionário",
    };
    return labels[acao] || acao;
  };

  if (isLoading && auditorias.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Histórico de Ações</Text>
          <Text style={styles.subtitle}>Auditoria da empresa</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Total: <Text style={styles.infoBold}>{auditorias.length}</Text>{" "}
          ação(ões)
        </Text>
      </View>

      {/* Lista */}
      {auditorias.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma ação registrada</Text>
          <Text style={styles.emptySubtext}>
            Quando ações forem realizadas, elas aparecerão aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={auditorias}
          keyExtractor={(item) => item.id}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!isLoading) {
              // Implementar paginação se necessário
            }
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleOpenDetails(item)}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.icon}>{getActionIcon(item.acao)}</Text>
                  <View style={styles.titleSection}>
                    <Text style={styles.cardTitle}>
                      {getActionLabel(item.acao)}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {item.funcionarioNome}
                    </Text>
                  </View>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>
                    {new Date(item.criadoEm)
                      .getHours()
                      .toString()
                      .padStart(2, "0")}
                    :
                    {new Date(item.criadoEm)
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}
                  </Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Função:</Text>
                  <Text style={styles.value}>{item.qualificacao}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Coleção:</Text>
                  <Text style={styles.value}>{item.colecao}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Data:</Text>
                  <Text style={styles.value}>
                    {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
              </View>

              {/* Chevron */}
              <View style={styles.cardFooter}>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={carregarAuditoria}
        />
      )}

      {/* Modal Detalhes */}
      {selectedLog && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {getActionIcon(selectedLog.acao)} Detalhes da Ação
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody}>
                {/* Quem */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>👤 Quem Fez</Text>
                  <View style={styles.dataBox}>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Nome:</Text>
                      <Text style={styles.dataValue}>
                        {selectedLog.funcionarioNome}
                      </Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Função:</Text>
                      <Text style={styles.dataValue}>
                        {selectedLog.qualificacao}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* O que */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📋 O que Foi Feito</Text>
                  <View style={styles.dataBox}>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Ação:</Text>
                      <Text style={styles.dataValue}>
                        {getActionLabel(selectedLog.acao)}
                      </Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Coleção:</Text>
                      <Text style={styles.dataValue}>
                        {selectedLog.colecao}
                      </Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>ID Documento:</Text>
                      <Text style={styles.dataValue}>
                        {selectedLog.documentoId}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quando */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📅 Quando</Text>
                  <View style={styles.dataBox}>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Data/Hora:</Text>
                      <Text style={styles.dataValue}>
                        {formatarData(selectedLog.criadoEm)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Dados */}
                {Object.keys(selectedLog.dados).length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Dados Afetados</Text>
                    <View style={styles.jsonBox}>
                      <Text style={styles.jsonText}>
                        {JSON.stringify(selectedLog.dados, null, 2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Mudanças */}
                {selectedLog.mudancas &&
                  Object.keys(selectedLog.mudancas).length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        🔄 Mudanças Realizadas
                      </Text>
                      <View style={styles.changesList}>
                        {Object.entries(selectedLog.mudancas).map(
                          ([key, value]: any, idx) => (
                            <View key={idx} style={styles.changeItem}>
                              <Text style={styles.changeKey}>{key}</Text>
                              <View style={styles.changeValues}>
                                <View style={styles.changeFrom}>
                                  <Text style={styles.changeLabel}>De:</Text>
                                  <Text style={styles.changeText}>
                                    {String(value.de || "-")}
                                  </Text>
                                </View>
                                <Text style={styles.arrow}>→</Text>
                                <View style={styles.changeTo}>
                                  <Text style={styles.changeLabel}>Para:</Text>
                                  <Text style={styles.changeText}>
                                    {String(value.para || "-")}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ),
                        )}
                      </View>
                    </View>
                  )}
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.closeModalText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 45,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#DBEAFE",
  },
  infoBox: {
    backgroundColor: "#DBEAFE",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  infoText: {
    fontSize: 13,
    color: "#1F2937",
  },
  infoBold: {
    fontWeight: "bold",
    color: "#2563EB",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  timeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  cardContent: {
    backgroundColor: "#FAFBFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    width: 70,
  },
  value: {
    fontSize: 11,
    color: "#1F2937",
    flex: 1,
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  chevron: {
    fontSize: 24,
    color: "#D1D5DB",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeBtn: {
    fontSize: 24,
    color: "#6B7280",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: "75%",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  dataBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dataRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    width: 80,
  },
  dataValue: {
    fontSize: 12,
    color: "#1F2937",
    flex: 1,
  },
  jsonBox: {
    backgroundColor: "#1F2937",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 200,
  },
  jsonText: {
    fontSize: 10,
    color: "#10B981",
    fontFamily: "monospace",
  },
  changesList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  changeItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  changeKey: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  changeValues: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeFrom: {
    flex: 1,
  },
  changeTo: {
    flex: 1,
  },
  changeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  changeText: {
    fontSize: 11,
    color: "#1F2937",
    marginTop: 2,
  },
  arrow: {
    fontSize: 16,
    color: "#D1D5DB",
    marginHorizontal: 4,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  closeModalBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeModalText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
