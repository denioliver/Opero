import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MailComposer from "expo-mail-composer";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { useClients } from "../../contexts/ClientsContext";
import { useSuppliers } from "../../contexts/SuppliersContext";
import { useProducts } from "../../contexts/ProductsContext";
import { useOrders } from "../../contexts/OrdersContext";
import { useInvoices } from "../../contexts/InvoicesContext";
import { useCompany } from "../../contexts/CompanyContext";
import { useReceivables } from "../../contexts/ReceivablesContext";
import { usePayables } from "../../contexts/PayablesContext";
import {
  exportReportCsv,
  exportReportPdf,
  generateReportPdfFile,
} from "../../utils/reportExport";
import {
  formatCurrencyBRL,
  formatDateTimeBRL,
  formatPercentBRL,
} from "../../utils/formatters";

type ExportHistoryItem = {
  id: string;
  format: "CSV" | "PDF" | "EMAIL";
  periodLabel: string;
  generatedAt: string;
  destination?: string;
};

type RangeMode = "7" | "30" | "90" | "all" | "custom";

const RANGE_OPTIONS: Array<{ label: string; value: RangeMode }> = [
  { label: "7 dias", value: "7" },
  { label: "30 dias", value: "30" },
  { label: "90 dias", value: "90" },
  { label: "Tudo", value: "all" },
  { label: "Personalizado", value: "custom" },
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  confirmada: "Confirmada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  faturada: "Faturada",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  paga: "Paga",
  atrasada: "Atrasada",
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") {
    const converted = value.toDate();
    return converted instanceof Date ? converted : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseBrDateInput = (value: string, endOfDay = false): Date | null => {
  const parts = value.split("/");
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const formatCurrency = (value: number) => formatCurrencyBRL(value);

const formatPercent = (value: number) => formatPercentBRL(value, 1);

const getHistoryStorageKey = (companyId?: string) =>
  `@opero_report_exports:${companyId || "global"}`;

export const RelatoriosScreen: React.FC = () => {
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const { company } = useCompany();
  const { clientes, loadClientes, isLoading: loadingClientes } = useClients();
  const {
    fornecedores,
    loadFornecedores,
    isLoading: loadingFornecedores,
  } = useSuppliers();
  const { products, loadProducts, isLoadingProducts } = useProducts();
  const { orders, loadOrders, isLoadingOrders } = useOrders();
  const { invoices, loadInvoices, isLoadingInvoices } = useInvoices();
  const { contasReceber, loadContasReceber, totalPendente, totalAtrasado } =
    useReceivables();
  const {
    contasPagar,
    loadContasPagar,
    totalPendentePagar,
    totalAtrasadoPagar,
  } = usePayables();

  const [rangeMode, setRangeMode] = useState<RangeMode>("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);

  const isProprietario = user?.role === "users";

  const canAccess = useMemo(() => {
    if (isProprietario) return true;
    if (!funcionario?.canAccessAdminCards) return false;

    const perms = funcionario.adminPermissions;
    if (!perms) return true;

    return !!perms.relatorios;
  }, [funcionario, isProprietario]);

  useEffect(() => {
    if (!canAccess) return;

    Promise.all([
      loadClientes(),
      loadFornecedores(),
      loadProducts(),
      loadOrders(),
      loadInvoices(),
      loadContasReceber(),
      loadContasPagar(),
    ]).catch((error) => {
      console.error("[Relatorios] Erro ao carregar dados:", error);
    });
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;

    const loadExportHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(
          getHistoryStorageKey(company?.companyId),
        );
        if (!raw) {
          setExportHistory([]);
          return;
        }

        const parsed = JSON.parse(raw) as ExportHistoryItem[];
        if (!Array.isArray(parsed)) {
          setExportHistory([]);
          return;
        }

        setExportHistory(parsed);
      } catch (error) {
        console.error("[Relatorios] Erro ao carregar histórico:", error);
      }
    };

    loadExportHistory();
  }, [canAccess, company?.companyId]);

  const isLoading =
    loadingClientes ||
    loadingFornecedores ||
    isLoadingProducts ||
    isLoadingOrders ||
    isLoadingInvoices;

  const rangeBoundary = useMemo(() => {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (rangeMode === "all") {
      return { start: null as Date | null, end };
    }

    if (rangeMode === "custom") {
      return {
        start: parseBrDateInput(customStart),
        end: parseBrDateInput(customEnd, true),
      };
    }

    const days = Number(rangeMode);
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);

    return { start, end };
  }, [rangeMode, customStart, customEnd]);

  const isWithinRange = (dateValue: any) => {
    const date = parseDate(dateValue);
    if (!date) return false;

    if (
      rangeMode === "custom" &&
      (!rangeBoundary.start || !rangeBoundary.end)
    ) {
      return true;
    }

    if (rangeBoundary.start && date < rangeBoundary.start) return false;
    if (rangeBoundary.end && date > rangeBoundary.end) return false;
    return true;
  };

  const filteredOrders = useMemo(
    () => orders.filter((order) => isWithinRange(order.issueDate)),
    [orders, rangeBoundary, rangeMode],
  );

  const filteredInvoices = useMemo(
    () => invoices.filter((invoice) => isWithinRange(invoice.issueDate)),
    [invoices, rangeBoundary, rangeMode],
  );

  const filteredClientes = useMemo(
    () => clientes.filter((cliente) => isWithinRange(cliente.createdAt)),
    [clientes, rangeBoundary, rangeMode],
  );

  const filteredProducts = useMemo(
    () => products.filter((product) => isWithinRange(product.createdAt)),
    [products, rangeBoundary, rangeMode],
  );

  const filteredFornecedores = useMemo(
    () =>
      fornecedores.filter((fornecedor) => isWithinRange(fornecedor.createdAt)),
    [fornecedores, rangeBoundary, rangeMode],
  );

  const metrics = useMemo(() => {
    const receitaRealizada = filteredInvoices
      .filter((invoice) => invoice.status === "paga")
      .reduce((sum, invoice) => sum + (invoice.totalValue || 0), 0);

    const receitaEmAberto = filteredInvoices
      .filter(
        (invoice) =>
          invoice.status === "enviada" || invoice.status === "atrasada",
      )
      .reduce((sum, invoice) => sum + (invoice.totalValue || 0), 0);

    const valorAtrasado = filteredInvoices
      .filter((invoice) => invoice.status === "atrasada")
      .reduce((sum, invoice) => sum + (invoice.totalValue || 0), 0);

    const totalOrdens = filteredOrders.length;
    const ordensConcluidas = filteredOrders.filter(
      (order) => order.status === "concluida" || order.status === "faturada",
    ).length;

    const taxaConclusao =
      totalOrdens > 0 ? (ordensConcluidas / totalOrdens) * 100 : 0;

    const ticketMedio =
      totalOrdens > 0
        ? filteredOrders.reduce(
            (sum, order) => sum + (order.totalValue || 0),
            0,
          ) / totalOrdens
        : 0;

    const totalComprasFornecedor = filteredFornecedores.reduce(
      (sum, fornecedor) => {
        const historico = fornecedor.historicoCompras || [];
        const comprasNoPeriodo = historico.filter((compra) =>
          isWithinRange(compra.data),
        );
        return (
          sum +
          comprasNoPeriodo.reduce(
            (subTotal, compra) => subTotal + (compra.valor || 0),
            0,
          )
        );
      },
      0,
    );

    const quantidadeComprasFornecedor = filteredFornecedores.reduce(
      (sum, fornecedor) => {
        const historico = fornecedor.historicoCompras || [];
        return (
          sum + historico.filter((compra) => isWithinRange(compra.data)).length
        );
      },
      0,
    );

    return {
      receitaRealizada,
      receitaEmAberto,
      valorAtrasado,
      totalOrdens,
      ordensConcluidas,
      taxaConclusao,
      ticketMedio,
      totalClientes: filteredClientes.length,
      clientesAtivos: filteredClientes.filter((item) => item.status === "ativo")
        .length,
      clientesBloqueados: filteredClientes.filter(
        (item) => item.status === "bloqueado",
      ).length,
      clientesInativos: filteredClientes.filter(
        (item) => item.status === "inativo",
      ).length,
      totalFornecedores: filteredFornecedores.length,
      fornecedoresAtivos: filteredFornecedores.filter(
        (item) => item.status === "ativo",
      ).length,
      fornecedoresBloqueados: filteredFornecedores.filter(
        (item) => item.status === "bloqueado",
      ).length,
      fornecedoresInativos: filteredFornecedores.filter(
        (item) => item.status === "inativo",
      ).length,
      totalComprasFornecedor,
      quantidadeComprasFornecedor,
      totalProdutos: filteredProducts.length,
      totalNotas: filteredInvoices.length,
      contasReceberPendente: totalPendente,
      contasReceberAtrasado: totalAtrasado,
      contasPagarPendente: totalPendentePagar,
      contasPagarAtrasado: totalAtrasadoPagar,
      lucroEstimado:
        receitaRealizada - (totalPendentePagar + totalAtrasadoPagar),
    };
  }, [
    filteredOrders,
    filteredInvoices,
    filteredClientes,
    filteredProducts,
    filteredFornecedores,
    totalPendente,
    totalAtrasado,
    totalPendentePagar,
    totalAtrasadoPagar,
  ]);

  const faturamentoMensal = useMemo(() => {
    const map = new Map<string, number>();

    filteredInvoices.forEach((invoice) => {
      const issueDate = parseDate(invoice.issueDate);
      if (!issueDate) return;

      const key = `${String(issueDate.getMonth() + 1).padStart(2, "0")}/${issueDate.getFullYear()}`;
      map.set(key, (map.get(key) || 0) + (invoice.totalValue || 0));
    });

    return Array.from(map.entries())
      .map(([mes, valor]) => ({ mes, valor }))
      .sort((a, b) => {
        const [ma, aa] = a.mes.split("/").map(Number);
        const [mb, ab] = b.mes.split("/").map(Number);
        return aa === ab ? ma - mb : aa - ab;
      });
  }, [filteredInvoices]);

  const topFornecedores = useMemo(() => {
    return filteredFornecedores
      .map((fornecedor) => {
        const historico = fornecedor.historicoCompras || [];
        const comprasNoPeriodo = historico.filter((compra) =>
          isWithinRange(compra.data),
        );
        const total = comprasNoPeriodo.reduce(
          (sum, compra) => sum + (compra.valor || 0),
          0,
        );
        return {
          id: fornecedor.id,
          nome: fornecedor.nome,
          quantidade: comprasNoPeriodo.length,
          total,
        };
      })
      .sort((a, b) => b.quantidade - a.quantidade || b.total - a.total)
      .slice(0, 5);
  }, [filteredFornecedores, rangeBoundary, rangeMode]);

  const periodLabel = useMemo(() => {
    if (rangeMode === "all") return "Todo o histórico";
    if (rangeMode === "custom") {
      if (customStart && customEnd) return `${customStart} até ${customEnd}`;
      return "Personalizado";
    }
    return `Últimos ${rangeMode} dias`;
  }, [rangeMode, customStart, customEnd]);

  const topClientes = useMemo(() => {
    const grouped = filteredInvoices.reduce<Record<string, number>>(
      (acc, invoice) => {
        const key =
          invoice.clientName || invoice.clientId || "Sem identificação";
        acc[key] = (acc[key] || 0) + (invoice.totalValue || 0);
        return acc;
      },
      {},
    );

    return Object.entries(grouped)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [filteredInvoices]);

  const topProdutos = useMemo(() => {
    const grouped = filteredOrders.reduce<Record<string, number>>(
      (acc, order) => {
        order.items.forEach((item) => {
          const key = item.productName || item.productId || "Item sem nome";
          const subtotal = item.subtotal || item.quantity * item.unitPrice || 0;
          acc[key] = (acc[key] || 0) + subtotal;
        });
        return acc;
      },
      {},
    );

    return Object.entries(grouped)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [filteredOrders]);

  const orderStatusRows = useMemo(() => {
    const grouped = filteredOrders.reduce<Record<string, number>>(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => ({
      label,
      value: grouped[status] || 0,
    }));
  }, [filteredOrders]);

  const invoiceStatusRows = useMemo(() => {
    const grouped = filteredInvoices.reduce<Record<string, number>>(
      (acc, invoice) => {
        acc[invoice.status] = (acc[invoice.status] || 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(INVOICE_STATUS_LABELS).map(([status, label]) => ({
      label,
      value: grouped[status] || 0,
    }));
  }, [filteredInvoices]);

  const handleResumoExecutivo = () => {
    Alert.alert(
      "Resumo executivo",
      [
        `Receita realizada: ${formatCurrency(metrics.receitaRealizada)}`,
        `Receita em aberto: ${formatCurrency(metrics.receitaEmAberto)}`,
        `Valor atrasado: ${formatCurrency(metrics.valorAtrasado)}`,
        `Taxa de conclusão de OS: ${formatPercent(metrics.taxaConclusao)}`,
        `Ticket médio: ${formatCurrency(metrics.ticketMedio)}`,
        `Compras em fornecedores: ${formatCurrency(metrics.totalComprasFornecedor)}`,
      ].join("\n"),
    );
  };

  const pushExportHistory = async (item: ExportHistoryItem) => {
    try {
      const nextHistory = [item, ...exportHistory].slice(0, 20);
      setExportHistory(nextHistory);
      await AsyncStorage.setItem(
        getHistoryStorageKey(company?.companyId),
        JSON.stringify(nextHistory),
      );
    } catch (error) {
      console.error("[Relatorios] Erro ao salvar histórico:", error);
    }
  };

  const buildExportPayload = () => {
    const generatedAt = formatDateTimeBRL(new Date());

    return {
      companyName: company?.name || "Opero",
      periodLabel,
      generatedAt,
      metrics: [
        {
          label: "Clientes cadastrados",
          value: String(metrics.totalClientes),
        },
        {
          label: "Clientes ativos",
          value: String(metrics.clientesAtivos),
        },
        {
          label: "Clientes bloqueados",
          value: String(metrics.clientesBloqueados),
        },
        {
          label: "Clientes inativos",
          value: String(metrics.clientesInativos),
        },
        {
          label: "Fornecedores cadastrados",
          value: String(metrics.totalFornecedores),
        },
        {
          label: "Fornecedores ativos",
          value: String(metrics.fornecedoresAtivos),
        },
        {
          label: "Compras em fornecedores",
          value: formatCurrency(metrics.totalComprasFornecedor),
        },
        {
          label: "Qtd compras fornecedores",
          value: String(metrics.quantidadeComprasFornecedor),
        },
        {
          label: "Receita realizada",
          value: formatCurrency(metrics.receitaRealizada),
        },
        {
          label: "Receita em aberto",
          value: formatCurrency(metrics.receitaEmAberto),
        },
        {
          label: "Valor atrasado",
          value: formatCurrency(metrics.valorAtrasado),
        },
        {
          label: "Ticket médio OS",
          value: formatCurrency(metrics.ticketMedio),
        },
        {
          label: "Taxa de conclusão",
          value: formatPercent(metrics.taxaConclusao),
        },
        {
          label: "Volume no período",
          value: `${metrics.totalOrdens} OS / ${metrics.totalNotas} NFs`,
        },
      ],
      orderStatusRows: orderStatusRows.map((row) => ({
        label: row.label,
        value: row.value,
      })),
      invoiceStatusRows: invoiceStatusRows.map((row) => ({
        label: row.label,
        value: row.value,
      })),
      topClientes: topClientes.map((item) => ({
        label: item.nome,
        value: formatCurrency(item.valor),
      })),
      topProdutos: topProdutos.map((item) => ({
        label: item.nome,
        value: formatCurrency(item.valor),
      })),
    };
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await exportReportCsv(buildExportPayload());
      await pushExportHistory({
        id: `${Date.now()}-csv`,
        format: "CSV",
        periodLabel,
        generatedAt: formatDateTimeBRL(new Date()),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao exportar CSV.";
      Alert.alert("Exportação", message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await exportReportPdf(buildExportPayload());
      await pushExportHistory({
        id: `${Date.now()}-pdf`,
        format: "PDF",
        periodLabel,
        generatedAt: formatDateTimeBRL(new Date()),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao exportar PDF.";
      Alert.alert("Exportação", message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendExecutiveEmail = async () => {
    const normalizedRecipient = recipientEmail.trim();
    if (!normalizedRecipient) {
      Alert.alert("Envio executivo", "Informe um e-mail de destino.");
      return;
    }

    try {
      setIsExporting(true);

      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Envio executivo",
          "Serviço de e-mail não disponível neste dispositivo.",
        );
        return;
      }

      const payload = buildExportPayload();
      const pdfUri = await generateReportPdfFile(payload);

      const subject = `Resumo Executivo - ${company?.name || "Opero"} - ${periodLabel}`;
      const body = [
        "Olá,",
        "",
        `Segue o resumo executivo do período ${periodLabel}.`,
        "",
        `Receita realizada: ${formatCurrency(metrics.receitaRealizada)}`,
        `Receita em aberto: ${formatCurrency(metrics.receitaEmAberto)}`,
        `Valor atrasado: ${formatCurrency(metrics.valorAtrasado)}`,
        `Taxa de conclusão OS: ${formatPercent(metrics.taxaConclusao)}`,
        `Compras em fornecedores: ${formatCurrency(metrics.totalComprasFornecedor)}`,
        "",
        "Arquivo em PDF anexado.",
        "",
        "Atenciosamente,",
        "Opero",
      ].join("\n");

      await MailComposer.composeAsync({
        recipients: [normalizedRecipient],
        subject,
        body,
        attachments: [pdfUri],
      });

      await pushExportHistory({
        id: `${Date.now()}-email`,
        format: "EMAIL",
        periodLabel,
        generatedAt: formatDateTimeBRL(new Date()),
        destination: normalizedRecipient,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao enviar e-mail.";
      Alert.alert("Envio executivo", message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!canAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.blockedTitle}>Acesso restrito</Text>
        <Text style={styles.blockedText}>
          Você não tem permissão para acessar Relatórios.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
        <Text style={styles.subtitle}>Painel analítico da operação</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Período de análise</Text>
            <View style={styles.chipsRow}>
              {RANGE_OPTIONS.map((option) => {
                const selected = rangeMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => setRangeMode(option.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {rangeMode === "custom" && (
              <View style={styles.customRangeBox}>
                <View style={[styles.inputGroup, { marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Data início</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="dd/mm/aaaa"
                    value={customStart}
                    onChangeText={setCustomStart}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Data fim</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="dd/mm/aaaa"
                    value={customEnd}
                    onChangeText={setCustomEnd}
                  />
                </View>
              </View>
            )}

            <View style={styles.exportActionsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  isExporting && styles.secondaryButtonDisabled,
                ]}
                onPress={handleExportCsv}
                disabled={isExporting}
              >
                <Text style={styles.secondaryButtonText}>Exportar CSV</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  isExporting && styles.secondaryButtonDisabled,
                ]}
                onPress={handleExportPdf}
                disabled={isExporting}
              >
                <Text style={styles.secondaryButtonText}>Exportar PDF</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.executiveBox}>
              <Text style={styles.inputLabel}>Envio executivo por e-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="diretoria@empresa.com"
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { marginTop: 8 },
                  isExporting && styles.secondaryButtonDisabled,
                ]}
                onPress={handleSendExecutiveEmail}
                disabled={isExporting}
              >
                <Text style={styles.secondaryButtonText}>
                  Enviar resumo por e-mail
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Receita realizada</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(metrics.receitaRealizada)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Receita em aberto</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(metrics.receitaEmAberto)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Valor atrasado</Text>
              <Text style={[styles.metricValue, { color: "#DC2626" }]}>
                {formatCurrency(metrics.valorAtrasado)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Ticket médio OS</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(metrics.ticketMedio)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Taxa de conclusão</Text>
              <Text style={styles.metricValue}>
                {formatPercent(metrics.taxaConclusao)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Volume no período</Text>
              <Text style={styles.metricValue}>
                {metrics.totalOrdens} OS / {metrics.totalNotas} NFs
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Lucro estimado</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(metrics.lucroEstimado)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Contas a receber</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(
                  metrics.contasReceberPendente + metrics.contasReceberAtrasado,
                )}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Contas a pagar</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(
                  metrics.contasPagarPendente + metrics.contasPagarAtrasado,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Faturamento mensal</Text>
            {faturamentoMensal.length === 0 ? (
              <Text style={styles.emptyText}>Sem faturamento no período.</Text>
            ) : (
              faturamentoMensal.map((item) => (
                <View key={item.mes} style={styles.inlineRow}>
                  <Text style={styles.rowLabel}>{item.mes}</Text>
                  <Text style={styles.rowValue}>
                    {formatCurrency(item.valor)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Indicadores de clientes</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Clientes cadastrados</Text>
              <Text style={styles.rowValue}>{metrics.totalClientes}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Clientes ativos</Text>
              <Text style={styles.rowValue}>{metrics.clientesAtivos}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Clientes bloqueados</Text>
              <Text style={styles.rowValue}>{metrics.clientesBloqueados}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Clientes inativos</Text>
              <Text style={styles.rowValue}>{metrics.clientesInativos}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Visão de base operacional</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Fornecedores no período</Text>
              <Text style={styles.rowValue}>{metrics.totalFornecedores}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Compras em fornecedores</Text>
              <Text style={styles.rowValue}>
                {formatCurrency(metrics.totalComprasFornecedor)}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Qtd compras fornecedores</Text>
              <Text style={styles.rowValue}>
                {metrics.quantidadeComprasFornecedor}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Produtos no período</Text>
              <Text style={styles.rowValue}>{metrics.totalProdutos}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Ordens concluídas</Text>
              <Text style={styles.rowValue}>{metrics.ordensConcluidas}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Indicadores de fornecedores</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Fornecedores ativos</Text>
              <Text style={styles.rowValue}>{metrics.fornecedoresAtivos}</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Fornecedores bloqueados</Text>
              <Text style={styles.rowValue}>
                {metrics.fornecedoresBloqueados}
              </Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.rowLabel}>Fornecedores inativos</Text>
              <Text style={styles.rowValue}>
                {metrics.fornecedoresInativos}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Distribuição por status (OS)</Text>
            {orderStatusRows.map((row) => (
              <View key={row.label} style={styles.inlineRow}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Distribuição por status (NF)</Text>
            {invoiceStatusRows.map((row) => (
              <View key={row.label} style={styles.inlineRow}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top 5 clientes por faturamento</Text>
            {topClientes.length === 0 ? (
              <Text style={styles.emptyText}>
                Sem dados para o período selecionado.
              </Text>
            ) : (
              topClientes.map((item, index) => (
                <View key={`${item.nome}-${index}`} style={styles.inlineRow}>
                  <Text style={styles.rowLabel}>
                    {index + 1}. {item.nome}
                  </Text>
                  <Text style={styles.rowValue}>
                    {formatCurrency(item.valor)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top 5 produtos/serviços</Text>
            {topProdutos.length === 0 ? (
              <Text style={styles.emptyText}>
                Sem dados para o período selecionado.
              </Text>
            ) : (
              topProdutos.map((item, index) => (
                <View key={`${item.nome}-${index}`} style={styles.inlineRow}>
                  <Text style={styles.rowLabel}>
                    {index + 1}. {item.nome}
                  </Text>
                  <Text style={styles.rowValue}>
                    {formatCurrency(item.valor)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top 5 fornecedores mais usados</Text>
            {topFornecedores.length === 0 ? (
              <Text style={styles.emptyText}>
                Sem dados para o período selecionado.
              </Text>
            ) : (
              topFornecedores.map((item, index) => (
                <View key={`${item.id}-${index}`} style={styles.inlineRow}>
                  <Text style={styles.rowLabel}>
                    {index + 1}. {item.nome}
                  </Text>
                  <Text style={styles.rowValue}>
                    {item.quantidade} compra(s) • {formatCurrency(item.total)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleResumoExecutivo}
          >
            <Text style={styles.primaryButtonText}>Gerar resumo executivo</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Histórico de exportações</Text>
            {exportHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhuma exportação registrada ainda.
              </Text>
            ) : (
              exportHistory.map((item) => (
                <View key={item.id} style={styles.inlineRow}>
                  <View style={{ flexShrink: 1, marginRight: 8 }}>
                    <Text style={styles.rowLabel}>
                      {item.format} • {item.periodLabel}
                    </Text>
                    {!!item.destination && (
                      <Text style={styles.historyDestination}>
                        {item.destination}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.rowValue}>{item.generatedAt}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  header: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 45,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  loadingArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  chipsRow: {
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
  customRangeBox: {
    marginTop: 10,
    flexDirection: "row",
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 84,
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  metricValue: {
    marginTop: 8,
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    marginRight: 8,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  primaryButton: {
    marginTop: 2,
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  exportActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  executiveBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  historyDestination: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFB",
    padding: 16,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  blockedText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});
