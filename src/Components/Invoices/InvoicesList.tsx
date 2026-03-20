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
import { useInvoices } from "../../contexts/InvoicesContext";
import { Invoice, InvoiceStatus } from "../../types";
import { formatCurrencyBRL, formatDateBRL } from "../../utils/formatters";

interface InvoicesListProps {
  onSelectInvoice?: (invoice: Invoice) => void;
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  paga: "Paga",
  atrasada: "Atrasada",
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  rascunho: "#9CA3AF",
  enviada: "#3B82F6",
  paga: "#10B981",
  atrasada: "#DC2626",
};

export function InvoicesList({ onSelectInvoice }: InvoicesListProps) {
  const { invoices, isLoadingInvoices, loadInvoices } = useInvoices();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      (invoice.clientName &&
        invoice.clientName.toLowerCase().includes(searchText.toLowerCase())),
  );

  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={styles.invoiceCard}
      onPress={() => onSelectInvoice?.(item)}
    >
      <View style={styles.invoiceHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
          <Text style={styles.clientName}>{item.clientName || "Cliente"}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[item.status] },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.invoiceDetails}>
        <View style={styles.tableLine}>
          <Text style={styles.detailLabel}>Emissão</Text>
          <Text style={styles.detailValue}>
            {formatDateBRL(item.issueDate)}
          </Text>
        </View>

        <View style={styles.tableLine}>
          <Text style={styles.detailLabel}>Vencimento</Text>
          <Text style={styles.detailValue}>{formatDateBRL(item.dueDate)}</Text>
        </View>

        <View style={styles.tableLine}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatCurrencyBRL(item.totalValue)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notas Fiscais</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número ou cliente"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {isLoadingInvoices ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredInvoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText
              ? "Nenhuma nota fiscal encontrada"
              : "Você ainda não tem notas fiscais"}
          </Text>
          <Text style={styles.emptyHint}>
            As notas fiscais são geradas a partir das ordens de serviço
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          renderItem={renderInvoiceItem}
          keyExtractor={(item) => item.invoiceId}
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
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
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  invoiceCard: {
    backgroundColor: "#fff",
    borderRadius: 9,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  invoiceDetails: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
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
  detailLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
});
