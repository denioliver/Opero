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
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { useCompany } from "../../contexts/CompanyContext";
import { listarAuditoria } from "../../services/firebase/auditoriaService";
import { AuditoriaLog } from "../../domains/auth/types";

type AuditoriaRouteParams = {
  statusKey?: "ordens" | "clientes" | "produtos" | "nfs";
  statusLabel?: string;
};

export const AuditoriaScreen: React.FC = () => {
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const { company } = useCompany();
  const route = useRoute<any>();
  const params = (route.params || {}) as AuditoriaRouteParams;
  const statusKey = params.statusKey;
  const statusLabel = params.statusLabel;
  const isStatusHistory = !!statusKey;
  const [auditorias, setAuditorias] = useState<AuditoriaLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterAcao, setFilterAcao] = useState("");
  const [filterColecao, setFilterColecao] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  const isProprietario = user?.role === "users";
  const canAccessThisScreen =
    isProprietario ||
    (!!funcionario?.canAccessAdminCards &&
      (!funcionario.adminPermissions ||
        !!funcionario.adminPermissions.auditoria));

  const matchesStatusFilter = (
    log: AuditoriaLog,
    key: "ordens" | "clientes" | "produtos" | "nfs",
  ) => {
    const acao = (log.acao || "").toLowerCase();
    const colecao = (log.colecao || "").toLowerCase();

    if (key === "ordens") {
      return colecao.includes("ord") || acao.includes("ord");
    }

    if (key === "clientes") {
      return colecao.includes("cliente") || acao.includes("cliente");
    }

    if (key === "produtos") {
      return colecao.includes("produto") || acao.includes("produto");
    }

    return (
      colecao.includes("nota") ||
      colecao.includes("fiscal") ||
      acao.includes("nota") ||
      acao.includes("fiscal")
    );
  };

  useEffect(() => {
    if (company && canAccessThisScreen) {
      carregarAuditoria();
    }
  }, [
    company,
    canAccessThisScreen,
    statusKey,
    filterAcao,
    filterColecao,
    filterResponsavel,
    filterDataInicio,
    filterDataFim,
  ]);

  const parseBrDate = (value: string, endOfDay: boolean) => {
    const raw = (value || "").trim();
    if (!raw) return undefined;

    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!day || !month || !year) return undefined;

    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return undefined;

    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return date;
  };

  const carregarAuditoria = async () => {
    if (!company) return;
    try {
      setIsLoading(true);
      const dataInicio = parseBrDate(filterDataInicio, false);
      const dataFim = parseBrDate(filterDataFim, true);

      // Busca ampla + filtros em memória (permite substring, sem depender de indexes)
      const logs = await listarAuditoria(company.companyId, {
        dataInicio,
        dataFim,
      });

      const acaoTerm = filterAcao.trim().toLowerCase();
      const colecaoTerm = filterColecao.trim().toLowerCase();
      const respTerm = filterResponsavel.trim().toLowerCase();

      let filtered = logs;

      if (acaoTerm) {
        filtered = filtered.filter((log) =>
          (log.acao || "").toLowerCase().includes(acaoTerm),
        );
      }

      if (colecaoTerm) {
        filtered = filtered.filter((log) =>
          (log.colecao || "").toLowerCase().includes(colecaoTerm),
        );
      }

      if (respTerm) {
        filtered = filtered.filter((log) =>
          (log.funcionarioNome || "").toLowerCase().includes(respTerm),
        );
      }

      if (statusKey) {
        filtered = filtered.filter((log) =>
          matchesStatusFilter(log, statusKey),
        );
      } else {
        // sem filtro por status
      }

      setAuditorias(filtered);
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
      criar_cliente: "CRI",
      editar_cliente: "EDT",
      deletar_cliente: "DEL",
      criar_produto: "CRI",
      editar_produto: "EDT",
      deletar_produto: "DEL",
      criar_ordem: "CRI",
      editar_ordem: "EDT",
      completar_ordem: "OK",
      criar_funcionario: "CRI",
      editar_funcionario: "EDT",
      desativar_funcionario: "BLO",
    };
    return icons[acao] || "LOG";
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

  if (!canAccessThisScreen) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: "#6B7280" }}>
          Você não tem permissão para acessar esta tela.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Histórico de Ações</Text>
          <Text style={styles.subtitle}>
            {statusLabel
              ? `Histórico de ${statusLabel}`
              : "Auditoria da empresa"}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Total: <Text style={styles.infoBold}>{auditorias.length}</Text>{" "}
          ação(ões)
        </Text>
      </View>

      {/* Filtros */}
      <View style={styles.filtersBox}>
        <View style={styles.filtersRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Ação</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="ex: criar_funcionario"
              value={filterAcao}
              onChangeText={setFilterAcao}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Coleção</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="ex: funcionarios"
              value={filterColecao}
              onChangeText={setFilterColecao}
            />
          </View>
        </View>

        <View style={styles.filtersRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Responsável</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="nome/email"
              value={filterResponsavel}
              onChangeText={setFilterResponsavel}
            />
          </View>
        </View>

        <View style={styles.filtersRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Data início</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="dd/mm/aaaa"
              value={filterDataInicio}
              onChangeText={setFilterDataInicio}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Data fim</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="dd/mm/aaaa"
              value={filterDataFim}
              onChangeText={setFilterDataFim}
            />
          </View>
        </View>
      </View>

      {/* Tabela */}
      {auditorias.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma ação registrada</Text>
          <Text style={styles.emptySubtext}>
            Quando ações forem realizadas, elas aparecerão aqui
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colDate]}>Data/Hora</Text>
              <Text style={[styles.th, styles.colAction]}>Ação</Text>
              <Text style={[styles.th, styles.colCollection]}>Coleção</Text>
              <Text style={[styles.th, styles.colDoc]}>Documento</Text>
              <Text style={[styles.th, styles.colUser]}>Responsável</Text>
            </View>

            <FlatList
              data={auditorias}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tableRow}
                  onPress={() => handleOpenDetails(item)}
                >
                  <Text style={[styles.td, styles.colDate]} numberOfLines={1}>
                    {formatarData(item.criadoEm)}
                  </Text>
                  <Text style={[styles.td, styles.colAction]} numberOfLines={1}>
                    {item.acao}
                  </Text>
                  <Text
                    style={[styles.td, styles.colCollection]}
                    numberOfLines={1}
                  >
                    {item.colecao}
                  </Text>
                  <Text style={[styles.td, styles.colDoc]} numberOfLines={1}>
                    {item.documentoId}
                  </Text>
                  <Text style={[styles.td, styles.colUser]} numberOfLines={1}>
                    {item.funcionarioNome}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.tableListContent}
              refreshing={isLoading}
              onRefresh={carregarAuditoria}
            />
          </View>
        </ScrollView>
      )}

      {/* Modal Detalhes */}
      {selectedLog && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes da Ação</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody}>
                {/* Quem */}
                {!isStatusHistory && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Responsável</Text>
                    <View style={styles.dataBox}>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Nome:</Text>
                        <Text style={styles.dataValue}>
                          {selectedLog.funcionarioNome}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Cargo:</Text>
                        <Text style={styles.dataValue}>
                          {selectedLog.qualificacao}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* O que */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ação Executada</Text>
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
                  <Text style={styles.sectionTitle}>Data e Hora</Text>
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
                    <Text style={styles.sectionTitle}>Dados Afetados</Text>
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
  filtersBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  tableWrap: {
    minWidth: 820,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableListContent: {
    paddingBottom: 30,
  },
  th: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },
  td: {
    fontSize: 12,
    color: "#111827",
  },
  colDate: {
    width: 150,
    paddingRight: 10,
  },
  colAction: {
    width: 160,
    paddingRight: 10,
  },
  colCollection: {
    width: 140,
    paddingRight: 10,
  },
  colDoc: {
    width: 160,
    paddingRight: 10,
  },
  colUser: {
    width: 190,
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
    fontSize: 10,
    marginRight: 12,
    color: "#4B5563",
    fontWeight: "700",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
