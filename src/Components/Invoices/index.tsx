import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { InvoicesList } from "./InvoicesList";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { Invoice } from "../../types";
import { formatCurrencyBRL, formatDateBRL } from "../../utils/formatters";

function InvoiceDetails({
  invoice,
  onBack,
}: {
  invoice: Invoice;
  onBack: () => void;
}) {
  const { funcionario } = useFuncionario();
  const canWrite = !funcionario?.readOnlyAccess;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Detalhes da Nota</Text>
        {!canWrite && (
          <Text style={styles.subtitle}>
            Modo leitura: dados sensíveis ocultos
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Número</Text>
            <Text style={styles.value}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>
              {canWrite
                ? invoice.clientName || invoice.clientId
                : "Cliente oculto"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Ordem</Text>
            <Text style={styles.value}>
              {canWrite ? invoice.orderId : "OS oculta"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Emissão</Text>
            <Text style={styles.value}>{formatDateBRL(invoice.issueDate)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Vencimento</Text>
            <Text style={styles.value}>{formatDateBRL(invoice.dueDate)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itens</Text>
          {invoice.items?.length ? (
            invoice.items.map((item, index) => (
              <View
                key={item.itemId || `${item.productId}-${index}`}
                style={styles.itemRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {canWrite
                      ? item.productName || item.productId
                      : "Item oculto"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {canWrite
                      ? `${item.quantity} x ${formatCurrencyBRL(item.unitPrice)}`
                      : "Dados ocultos"}
                  </Text>
                </View>
                <Text style={styles.itemValue}>
                  {canWrite ? formatCurrencyBRL(item.subtotal) : "Valor oculto"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Sem itens registrados</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo financeiro</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>
              {canWrite
                ? formatCurrencyBRL(invoice.subtotal || 0)
                : "Valor oculto"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Impostos</Text>
            <Text style={styles.value}>
              {canWrite
                ? formatCurrencyBRL(invoice.taxes || 0)
                : "Valor oculto"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Desconto</Text>
            <Text style={styles.value}>
              {canWrite
                ? formatCurrencyBRL(invoice.discount || 0)
                : "Valor oculto"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {canWrite
                ? formatCurrencyBRL(invoice.totalValue || 0)
                : "Valor oculto"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Observações</Text>
          <Text style={styles.notesText}>
            {canWrite
              ? invoice.notes?.trim() || "Sem observações"
              : invoice.notes?.trim()
                ? "Observação registrada"
                : "Sem observações"}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Voltar para lista</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function InvoicesScreen() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  if (selectedInvoice) {
    return (
      <InvoiceDetails
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
      />
    );
  }

  return <InvoicesList onSelectInvoice={setSelectedInvoice} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 38,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 12,
    color: "#92400E",
    marginTop: 2,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginRight: 10,
  },
  value: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "700",
  },
  itemRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  itemMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
  },
  notesText: {
    fontSize: 13,
    color: "#374151",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
