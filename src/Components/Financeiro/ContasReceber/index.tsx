import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useReceivables } from "../../../contexts/ReceivablesContext";
import { formatCurrencyBRL, formatDateBRL } from "../../../utils/formatters";

export function ContasReceberScreen() {
  const {
    contasReceber,
    isLoadingContasReceber,
    loadContasReceber,
    baixarPagamento,
    atualizarAtrasos,
  } = useReceivables();

  useEffect(() => {
    loadContasReceber().then(atualizarAtrasos).catch(console.error);
  }, [loadContasReceber]);

  const handleBaixar = async (id: string) => {
    try {
      await baixarPagamento(id, "transferencia");
      Alert.alert("Sucesso", "Pagamento baixado com sucesso");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível baixar pagamento");
    }
  };

  if (isLoadingContasReceber) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contas a Receber</Text>
      </View>

      <FlatList
        data={contasReceber}
        keyExtractor={(item) => item.contaReceberId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.clientText}>
                {item.clienteNome || item.clienteId}
              </Text>
              <Text style={styles.valueText}>
                {formatCurrencyBRL(item.valor)}
              </Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.metaText}>
                Venc.: {formatDateBRL(item.dataVencimento)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  item.status === "pago"
                    ? styles.statusPaid
                    : item.status === "atrasado"
                      ? styles.statusLate
                      : styles.statusPending,
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            {item.status !== "pago" && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => handleBaixar(item.contaReceberId)}
              >
                <Text style={styles.payButtonText}>Baixar pagamento</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  valueText: { fontSize: 14, fontWeight: "700", color: "#059669" },
  metaText: { fontSize: 12, color: "#6B7280" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusPending: { backgroundColor: "#DBEAFE" },
  statusPaid: { backgroundColor: "#DCFCE7" },
  statusLate: { backgroundColor: "#FEE2E2" },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
    textTransform: "uppercase",
  },
  payButton: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  payButtonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
