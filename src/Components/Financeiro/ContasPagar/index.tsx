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
import { usePayables } from "../../../contexts/PayablesContext";
import { formatCurrencyBRL, formatDateBRL } from "../../../utils/formatters";

export function ContasPagarScreen() {
  const {
    contasPagar,
    isLoadingContasPagar,
    loadContasPagar,
    pagarConta,
    atualizarAtrasosPagar,
    gerarRecorrencia,
  } = usePayables();

  useEffect(() => {
    loadContasPagar().then(atualizarAtrasosPagar).catch(console.error);
  }, [loadContasPagar]);

  const handlePagar = async (id: string) => {
    try {
      await pagarConta(id, "transferencia");
      await gerarRecorrencia(id);
      Alert.alert("Sucesso", "Conta paga com sucesso");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível pagar conta");
    }
  };

  if (isLoadingContasPagar) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contas a Pagar</Text>
      </View>

      <FlatList
        data={contasPagar}
        keyExtractor={(item) => item.contaPagarId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.clientText}>
                {item.fornecedorNome || item.descricao || "Despesa"}
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

            {item.status !== "pago" && item.status !== "cancelado" && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => handlePagar(item.contaPagarId)}
              >
                <Text style={styles.payButtonText}>
                  Pagar fornecedor/despesa
                </Text>
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
  listContent: { padding: 10, gap: 8 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9,
    padding: 10,
    gap: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  valueText: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  metaText: { fontSize: 11, color: "#6B7280" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusPending: { backgroundColor: "#DBEAFE" },
  statusPaid: { backgroundColor: "#DCFCE7" },
  statusLate: { backgroundColor: "#FEE2E2" },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F2937",
    textTransform: "uppercase",
  },
  payButton: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  payButtonText: { color: "#fff", fontWeight: "600", fontSize: 11 },
});
