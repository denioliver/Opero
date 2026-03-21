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
import { formatDateTimeBRL } from "../../utils/formatters";

type AuditoriaRouteParams = {
  statusKey?: "ordens" | "clientes" | "produtos" | "nfs";
  statusLabel?: string;
};

const ACAO_SUGESTOES = [
  "criar_funcionario",
  "editar_funcionario",
  "desativar_funcionario",
  "criar_cliente",
  "editar_cliente",
  "criar_produto",
  "editar_produto",
  "criar_ordem",
  "editar_ordem",
];

const COLECAO_SUGESTOES = [
  "funcionarios",
  "clientes",
  "produtos",
  "ordens",
  "auditoria",
];

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
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  const formatBrDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const applyQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    setFilterDataInicio(formatBrDate(startDate));
    setFilterDataFim(formatBrDate(endDate));
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
          getResponsavelNome(log).toLowerCase().includes(respTerm),
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
    return formatDateTimeBRL(date);
  };

  const getResponsavelNome = (log: AuditoriaLog) => {
    return log.funcionarioNome || "Responsável não informado";
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
      criar_fornecedor: "Criou Fornecedor",
      editar_fornecedor: "Editou Fornecedor",
      deletar_fornecedor: "Arquivou Fornecedor",
      registrar_compra_fornecedor: "Registrou Compra em Fornecedor",
      criar_nota_fiscal: "Criou Nota Fiscal",
      editar_nota_fiscal: "Editou Nota Fiscal",
      deletar_nota_fiscal: "Deletou Nota Fiscal",
      criar_pedido: "Criou Pedido",
      editar_pedido: "Editou Pedido",
      deletar_pedido: "Deletou Pedido",
      faturar_pedido: "Faturou Pedido",
      criar_conta_receber: "Criou Conta a Receber",
      editar_conta_receber: "Editou Conta a Receber",
      criar_conta_pagar: "Criou Conta a Pagar",
      editar_conta_pagar: "Editou Conta a Pagar",
    };

    if (labels[acao]) {
      return labels[acao];
    }

    return acao
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const getLabelFromKey = (key: string) => {
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatSimpleValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (value instanceof Date) return formatarData(value);
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value || "-";
    if (Array.isArray(value)) {
      if (value.length === 0) return "-";
      return value
        .map((item) => {
          if (item && typeof item === "object") {
            const base =
              item.nome ||
              item.name ||
              item.descricao ||
              item.id ||
              item.codigo;
            return base ? String(base) : "Item";
          }
          return String(item);
        })
        .join(", ");
    }
    if (typeof value === "object") {
      const resumo = Object.entries(value)
        .slice(0, 4)
        .map(([k, v]) => `${getLabelFromKey(k)}: ${formatSimpleValue(v)}`)
        .join(" • ");
      return resumo || "Dados atualizados";
    }
    return String(value);
  };

  const getDetalhesAcao = (
    log: AuditoriaLog,
  ): Array<{ label: string; value: string }> => {
    const detalhes: Array<{ label: string; value: string }> = [];
    const dados = log.dados || {};

    Object.entries(dados).forEach(([key, value]) => {
      detalhes.push({
        label: getLabelFromKey(key),
        value: formatSimpleValue(value),
      });
    });

    if (log.mudancas && Object.keys(log.mudancas).length > 0) {
      Object.entries(log.mudancas).forEach(([key, value]: any) => {
        detalhes.push({
          label: `Mudança em ${getLabelFromKey(key)}`,
          value: `De ${formatSimpleValue(value?.de)} para ${formatSimpleValue(value?.para)}`,
        });
      });
    }

    if (detalhes.length === 0) {
      detalhes.push({
        label: "Resumo",
        value: "Ação registrada sem detalhes adicionais",
      });
    }

    return detalhes;
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
        <TouchableOpacity
          style={styles.quickFilterToggle}
          onPress={() => setShowQuickFilters((prev) => !prev)}
        >
          <Text style={styles.quickFilterToggleText}>Filtros rápidos</Text>
          <Text style={styles.quickFilterToggleIcon}>
            {showQuickFilters ? "▴" : "▾"}
          </Text>
        </TouchableOpacity>

        {showQuickFilters && (
          <View style={styles.quickFiltersPanel}>
            <Text style={styles.quickFiltersLabel}>Ação</Text>
            <View style={styles.quickChipsRow}>
              {ACAO_SUGESTOES.map((acao) => (
                <TouchableOpacity
                  key={acao}
                  style={[
                    styles.quickChip,
                    filterAcao === acao && styles.quickChipActive,
                  ]}
                  onPress={() =>
                    setFilterAcao((prev) => (prev === acao ? "" : acao))
                  }
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      filterAcao === acao && styles.quickChipTextActive,
                    ]}
                  >
                    {acao}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.quickFiltersLabel}>Coleção</Text>
            <View style={styles.quickChipsRow}>
              {COLECAO_SUGESTOES.map((colecao) => (
                <TouchableOpacity
                  key={colecao}
                  style={[
                    styles.quickChip,
                    filterColecao === colecao && styles.quickChipActive,
                  ]}
                  onPress={() =>
                    setFilterColecao((prev) =>
                      prev === colecao ? "" : colecao,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      filterColecao === colecao && styles.quickChipTextActive,
                    ]}
                  >
                    {colecao}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.quickFiltersLabel}>Período</Text>
            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => applyQuickDateRange(0)}
              >
                <Text style={styles.quickChipText}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => applyQuickDateRange(7)}
              >
                <Text style={styles.quickChipText}>7 dias</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => applyQuickDateRange(30)}
              >
                <Text style={styles.quickChipText}>30 dias</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => {
                  setFilterAcao("");
                  setFilterColecao("");
                  setFilterResponsavel("");
                  setFilterDataInicio("");
                  setFilterDataFim("");
                }}
              >
                <Text style={styles.quickChipText}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.quickFilterToggle}
          onPress={() => setShowAdvancedFilters((prev) => !prev)}
        >
          <Text style={styles.quickFilterToggleText}>Filtros avançados</Text>
          <Text style={styles.quickFilterToggleIcon}>
            {showAdvancedFilters ? "▴" : "▾"}
          </Text>
        </TouchableOpacity>

        {showAdvancedFilters && (
          <>
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
          </>
        )}
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
                    {getActionLabel(item.acao)}
                  </Text>
                  <Text style={[styles.td, styles.colUser]} numberOfLines={1}>
                    {getResponsavelNome(item)}
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
                          {getResponsavelNome(selectedLog)}
                        </Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Tipo:</Text>
                        <Text style={styles.dataValue}>
                          {selectedLog.qualificacao === "outro"
                            ? "Proprietário"
                            : selectedLog.qualificacao}
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

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Detalhes da Ação</Text>
                  <View style={styles.detailsList}>
                    {getDetalhesAcao(selectedLog).map((item, idx) => (
                      <View
                        key={`${item.label}-${idx}`}
                        style={styles.detailLine}
                      >
                        <Text style={styles.detailLineLabel}>
                          {item.label}:
                        </Text>
                        <Text style={styles.detailLineValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
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
  quickFilterToggle: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  quickFilterToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  quickFilterToggleIcon: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  quickFiltersPanel: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginBottom: 10,
  },
  quickFiltersLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    marginTop: 2,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  quickChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  quickChipTextActive: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  tableWrap: {
    minWidth: 620,
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
    width: 230,
    paddingRight: 10,
  },
  colUser: {
    width: 220,
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
  detailsList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLine: {
    marginBottom: 10,
  },
  detailLineLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 3,
  },
  detailLineValue: {
    fontSize: 12,
    color: "#1F2937",
    lineHeight: 18,
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
