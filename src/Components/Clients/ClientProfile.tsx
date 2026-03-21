/**
 * Perfil Completo do Cliente
 * Mostra dados, histórico de ordens e histórico financeiro
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Cliente } from "../../domains/clientes/types";
import { useClients } from "../../contexts/ClientsContext";
import { useOrders } from "../../contexts/OrdersContext";
import { useInvoices } from "../../contexts/InvoicesContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { Invoice, ServiceOrder } from "../../types";
import {
  formatCurrencyBRL,
  formatDateBRL,
  formatPercentBRL,
} from "../../utils/formatters";
import {
  maskAddressLine,
  maskDocument,
  maskEmail,
  maskPhone,
} from "../../utils/privacy";

const ORDER_STATUS_LABELS: Record<ServiceOrder["status"], string> = {
  aberto: "Aberto",
  faturado: "Faturado",
  cancelado: "Cancelado",
  rascunho: "Rascunho",
  confirmada: "Confirmada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  faturada: "Faturada",
};

const ORDER_STATUS_COLORS: Record<ServiceOrder["status"], string> = {
  aberto: "#2563EB",
  faturado: "#7C3AED",
  cancelado: "#DC2626",
  rascunho: "#9CA3AF",
  confirmada: "#3B82F6",
  em_andamento: "#F59E0B",
  concluida: "#10B981",
  faturada: "#8B5CF6",
};

const INVOICE_STATUS_LABELS: Record<Invoice["status"], string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  paga: "Paga",
  atrasada: "Atrasada",
};

const INVOICE_STATUS_COLORS: Record<Invoice["status"], string> = {
  rascunho: "#9CA3AF",
  enviada: "#3B82F6",
  paga: "#10B981",
  atrasada: "#DC2626",
};

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date ? parsed : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: any): string {
  return formatDateBRL(value);
}

function formatCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

interface ClientProfileProps {
  clienteId: string;
  onBack?: () => void;
  onEdit?: (cliente: Cliente) => void;
}

export function ClientProfile({
  clienteId,
  onBack,
  onEdit,
}: ClientProfileProps) {
  const { funcionario } = useFuncionario();
  const { clienteSelecionado, selectCliente, isLoading } = useClients();
  const { orders, loadOrders, isLoadingOrders } = useOrders();
  const { invoices, loadInvoices, isLoadingInvoices } = useInvoices();
  const shouldMaskSensitiveData = !!funcionario?.readOnlyAccess;
  const canWrite = !funcionario?.readOnlyAccess;
  const [activeTab, setActiveTab] = useState<"dados" | "ordens" | "financeiro">(
    "dados",
  );

  useEffect(() => {
    selectCliente(clienteId).catch((err) => {
      console.error("[ClientProfile] Erro ao carregar:", err);
    });
  }, [clienteId, selectCliente]);

  useEffect(() => {
    loadOrders().catch((err) => {
      console.error("[ClientProfile] Erro ao carregar ordens:", err);
    });

    loadInvoices().catch((err) => {
      console.error("[ClientProfile] Erro ao carregar financeiro:", err);
    });
  }, [clienteId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  if (!clienteSelecionado) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cliente não encontrado</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cliente = clienteSelecionado;
  const clientOrders = orders
    .filter((order) => order.clientId === cliente.id)
    .sort(
      (a, b) =>
        (parseDate(b.issueDate)?.getTime() || 0) -
        (parseDate(a.issueDate)?.getTime() || 0),
    );

  const clientInvoices = invoices
    .filter((invoice) => invoice.clientId === cliente.id)
    .sort(
      (a, b) =>
        (parseDate(b.issueDate)?.getTime() || 0) -
        (parseDate(a.issueDate)?.getTime() || 0),
    );

  const tipoLabel = cliente.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica";
  const statusLabel =
    cliente.status === "ativo"
      ? "Ativo"
      : cliente.status === "bloqueado"
        ? "Bloqueado"
        : "Arquivado";
  const documentoLabel = cliente.tipo === "pf" ? "CPF" : "CNPJ";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backIconButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{cliente.nome}</Text>
            <Text style={styles.subtitle}>{tipoLabel}</Text>
          </View>
        </View>
        {onEdit && canWrite && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(cliente)}
          >
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusBadge}>{statusLabel}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dados" && styles.tabActive]}
          onPress={() => setActiveTab("dados")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "dados" && styles.tabTextActive,
            ]}
          >
            Dados
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ordens" && styles.tabActive]}
          onPress={() => setActiveTab("ordens")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "ordens" && styles.tabTextActive,
            ]}
          >
            Ordens
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "financeiro" && styles.tabActive]}
          onPress={() => setActiveTab("financeiro")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "financeiro" && styles.tabTextActive,
            ]}
          >
            Financeiro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "dados" && (
          <DadosTab
            cliente={cliente}
            documentoLabel={documentoLabel}
            shouldMaskSensitiveData={shouldMaskSensitiveData}
          />
        )}

        {activeTab === "ordens" && (
          <OrdensTab
            orders={clientOrders}
            isLoading={isLoadingOrders}
            shouldMaskSensitiveData={shouldMaskSensitiveData}
          />
        )}

        {activeTab === "financeiro" && (
          <FinanceiroTab
            invoices={clientInvoices}
            isLoading={isLoadingInvoices}
            shouldMaskSensitiveData={shouldMaskSensitiveData}
          />
        )}
      </ScrollView>
    </View>
  );
}

function DadosTab({
  cliente,
  documentoLabel,
  shouldMaskSensitiveData,
}: {
  cliente: Cliente;
  documentoLabel: string;
  shouldMaskSensitiveData: boolean;
}) {
  return (
    <>
      {/* Informações Básicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Básicas</Text>

        <InfoRow label="Nome Completo" value={cliente.nome} />
        <InfoRow
          label={documentoLabel}
          value={
            shouldMaskSensitiveData
              ? maskDocument(cliente.documento)
              : cliente.documento
          }
        />
        <InfoRow label="Tipo" value={cliente.tipo === "pf" ? "PF" : "PJ"} />
        {cliente.rg && (
          <InfoRow
            label="RG"
            value={
              shouldMaskSensitiveData ? maskDocument(cliente.rg) : cliente.rg
            }
          />
        )}
        {cliente.sexo && (
          <InfoRow
            label="Sexo"
            value={
              cliente.sexo === "nao_informado"
                ? "Não informado"
                : cliente.sexo.charAt(0).toUpperCase() + cliente.sexo.slice(1)
            }
          />
        )}
      </View>

      {cliente.tipo === "pj" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Jurídicos</Text>
          {cliente.razaoSocial ? (
            <InfoRow label="Razão Social" value={cliente.razaoSocial} />
          ) : (
            <Text style={styles.emptyField}>Razão social não informada</Text>
          )}
          {cliente.nomeFantasia ? (
            <InfoRow label="Nome Fantasia" value={cliente.nomeFantasia} />
          ) : (
            <Text style={styles.emptyField}>Nome fantasia não informado</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Política Comercial</Text>
        <InfoRow
          label="Limite de Crédito"
          value={
            shouldMaskSensitiveData
              ? "Oculto"
              : formatCurrency(cliente.limiteCredito || 0)
          }
        />
        <InfoRow
          label="Desconto Padrão"
          value={
            shouldMaskSensitiveData
              ? "Oculto"
              : formatPercentBRL(cliente.descontoPercentual || 0, 2)
          }
        />
      </View>

      {/* Contato */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contato</Text>

        {cliente.telefone ? (
          <InfoRow
            label="Telefone"
            value={
              shouldMaskSensitiveData
                ? maskPhone(cliente.telefone)
                : cliente.telefone
            }
          />
        ) : (
          <Text style={styles.emptyField}>Telefone não informado</Text>
        )}

        {cliente.email ? (
          <InfoRow
            label="E-mail"
            value={
              shouldMaskSensitiveData ? maskEmail(cliente.email) : cliente.email
            }
          />
        ) : (
          <Text style={styles.emptyField}>E-mail não informado</Text>
        )}
      </View>

      {/* Endereço */}
      {cliente.endereco && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <InfoRow
            label="Logradouro"
            value={
              shouldMaskSensitiveData
                ? maskAddressLine(
                    `${cliente.endereco.rua}, ${cliente.endereco.numero}`,
                  )
                : `${cliente.endereco.rua}, ${cliente.endereco.numero}`
            }
          />
          <InfoRow
            label="Cidade"
            value={`${cliente.endereco.cidade}, ${cliente.endereco.estado}`}
          />
          <InfoRow
            label="CEP"
            value={
              shouldMaskSensitiveData
                ? maskDocument(cliente.endereco.cep)
                : cliente.endereco.cep
            }
          />
        </View>
      )}

      {/* Observações */}
      {cliente.observacoes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <View style={styles.observacoesBox}>
            <Text style={styles.observacoesText}>{cliente.observacoes}</Text>
          </View>
        </View>
      )}

      {/* Metadados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Sistema</Text>

        <InfoRow
          label="Data de Criação"
          value={formatDateBRL(cliente.createdAt)}
        />

        {cliente.updatedAt && (
          <InfoRow
            label="Última Atualização"
            value={formatDateBRL(cliente.updatedAt)}
          />
        )}
      </View>
    </>
  );
}

function OrdensTab({
  orders,
  isLoading,
  shouldMaskSensitiveData,
}: {
  orders: ServiceOrder[];
  isLoading: boolean;
  shouldMaskSensitiveData: boolean;
}) {
  const totalOrdens = orders.length;
  const totalFaturado = orders
    .filter(
      (order) => order.status === "faturada" || order.status === "concluida",
    )
    .reduce((sum, order) => sum + (order.totalValue || 0), 0);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Histórico de Ordens</Text>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateText}>—</Text>
          <Text style={styles.emptyStateTitle}>Sem ordens registradas</Text>
          <Text style={styles.emptyStateDescription}>
            As ordens de serviço deste cliente aparecerão aqui
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total de ordens</Text>
              <Text style={styles.summaryValue}>{totalOrdens}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Valor acumulado</Text>
              <Text style={styles.summaryValue}>
                {shouldMaskSensitiveData
                  ? "Valor oculto"
                  : formatCurrency(totalFaturado)}
              </Text>
            </View>
          </View>

          {orders.map((order) => (
            <View key={order.orderId} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyTitle}>
                    {shouldMaskSensitiveData ? "OS oculta" : order.orderNumber}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Emissão: {formatDate(order.issueDate)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: ORDER_STATUS_COLORS[order.status] + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: ORDER_STATUS_COLORS[order.status] },
                    ]}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.historyRow}>
                <Text style={styles.historyKey}>Itens</Text>
                <Text style={styles.historyVal}>
                  {order.items?.length || 0}
                </Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyKey}>Total</Text>
                <Text style={styles.historyVal}>
                  {shouldMaskSensitiveData
                    ? "Valor oculto"
                    : formatCurrency(order.totalValue || 0)}
                </Text>
              </View>
              {order.discountPercentApplied ? (
                <View style={styles.historyRow}>
                  <Text style={styles.historyKey}>Desconto aplicado</Text>
                  <Text style={styles.historyVal}>
                    {shouldMaskSensitiveData
                      ? "Oculto"
                      : formatPercentBRL(order.discountPercentApplied, 2)}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function FinanceiroTab({
  invoices,
  isLoading,
  shouldMaskSensitiveData,
}: {
  invoices: Invoice[];
  isLoading: boolean;
  shouldMaskSensitiveData: boolean;
}) {
  const totalFaturado = invoices.reduce(
    (sum, invoice) => sum + (invoice.totalValue || 0),
    0,
  );
  const totalPago = invoices
    .filter((invoice) => invoice.status === "paga")
    .reduce((sum, invoice) => sum + (invoice.totalValue || 0), 0);
  const totalEmAberto = invoices
    .filter(
      (invoice) =>
        invoice.status === "enviada" || invoice.status === "atrasada",
    )
    .reduce((sum, invoice) => sum + (invoice.totalValue || 0), 0);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Histórico Financeiro</Text>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateText}>—</Text>
          <Text style={styles.emptyStateTitle}>Sem movimentações</Text>
          <Text style={styles.emptyStateDescription}>
            O histórico financeiro deste cliente aparecerá aqui
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Faturado</Text>
              <Text style={styles.summaryValue}>
                {shouldMaskSensitiveData
                  ? "Valor oculto"
                  : formatCurrency(totalFaturado)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pago</Text>
              <Text style={styles.summaryValue}>
                {shouldMaskSensitiveData
                  ? "Valor oculto"
                  : formatCurrency(totalPago)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Em aberto</Text>
              <Text style={styles.summaryValue}>
                {shouldMaskSensitiveData
                  ? "Valor oculto"
                  : formatCurrency(totalEmAberto)}
              </Text>
            </View>
          </View>

          {invoices.map((invoice) => (
            <View key={invoice.invoiceId} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyTitle}>
                    {shouldMaskSensitiveData
                      ? "NF oculta"
                      : invoice.invoiceNumber}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Emissão: {formatDate(invoice.issueDate)} • Venc.:{" "}
                    {formatDate(invoice.dueDate)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        INVOICE_STATUS_COLORS[invoice.status] + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: INVOICE_STATUS_COLORS[invoice.status] },
                    ]}
                  >
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.historyRow}>
                <Text style={styles.historyKey}>Subtotal</Text>
                <Text style={styles.historyVal}>
                  {shouldMaskSensitiveData
                    ? "Valor oculto"
                    : formatCurrency(invoice.subtotal || 0)}
                </Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyKey}>Impostos</Text>
                <Text style={styles.historyVal}>
                  {shouldMaskSensitiveData
                    ? "Valor oculto"
                    : formatCurrency(invoice.taxes || 0)}
                </Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyKey}>Desconto</Text>
                <Text style={styles.historyVal}>
                  {shouldMaskSensitiveData
                    ? "Valor oculto"
                    : formatCurrency(invoice.discount || 0)}
                </Text>
              </View>
              <View style={styles.historyRow}>
                <Text style={styles.historyKey}>Total</Text>
                <Text style={[styles.historyVal, styles.totalHighlight]}>
                  {shouldMaskSensitiveData
                    ? "Valor oculto"
                    : formatCurrency(invoice.totalValue || 0)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backIconButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: "#2563EB",
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  editButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  emptyField: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  observacoesBox: {
    backgroundColor: "#F9FAFB",
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
  },
  observacoesText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  summaryGrid: {
    gap: 8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  historyCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  historyMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 7,
    paddingBottom: 4,
  },
  historyKey: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  historyVal: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "600",
  },
  totalHighlight: {
    color: "#059669",
    fontWeight: "700",
  },
  loadingBox: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  emptyStateDescription: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
  },
  backButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
