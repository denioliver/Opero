import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Fornecedor } from "../../domains/fornecedores/types";
import { formatCurrencyBRL } from "../../utils/formatters";

interface SuppliersReportsProps {
  fornecedores: Fornecedor[];
  onBack?: () => void;
}

export function SuppliersReports({
  fornecedores,
  onBack,
}: SuppliersReportsProps) {
  const rankings = useMemo(() => {
    const mapped = fornecedores.map((fornecedor) => {
      const historico = fornecedor.historicoCompras || [];
      const totalCompras = historico.reduce(
        (sum, compra) => sum + (compra.valor || 0),
        0,
      );
      const quantidadeCompras = historico.length;

      return {
        id: fornecedor.id,
        nome: fornecedor.nome,
        totalCompras,
        quantidadeCompras,
      };
    });

    const porValor = [...mapped].sort(
      (a, b) => b.totalCompras - a.totalCompras,
    );
    const maisUsados = [...mapped].sort(
      (a, b) => b.quantidadeCompras - a.quantidadeCompras,
    );

    return {
      porValor,
      maisUsados,
      totalGeral: mapped.reduce((sum, item) => sum + item.totalCompras, 0),
      totalCompras: mapped.reduce(
        (sum, item) => sum + item.quantidadeCompras,
        0,
      ),
    };
  }, [fornecedores]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios de Fornecedores</Text>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Compras totais</Text>
            <Text style={styles.kpiValue}>{rankings.totalCompras}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Volume comprado</Text>
            <Text style={styles.kpiValue}>
              {formatCurrencyBRL(rankings.totalGeral)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compras por fornecedor</Text>
          {rankings.porValor.length === 0 ? (
            <Text style={styles.empty}>Sem dados de compras ainda.</Text>
          ) : (
            rankings.porValor.map((item, index) => (
              <View key={`valor-${item.id}`} style={styles.rowItem}>
                <Text style={styles.rowLabel}>
                  {index + 1}. {item.nome}
                </Text>
                <Text style={styles.rowValue}>
                  {formatCurrencyBRL(item.totalCompras)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fornecedores mais usados</Text>
          {rankings.maisUsados.length === 0 ? (
            <Text style={styles.empty}>Sem histórico de uso ainda.</Text>
          ) : (
            rankings.maisUsados.map((item, index) => (
              <View key={`uso-${item.id}`} style={styles.rowItem}>
                <Text style={styles.rowLabel}>
                  {index + 1}. {item.nome}
                </Text>
                <Text style={styles.rowValue}>
                  {item.quantidadeCompras} compra(s)
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  header: {
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  backButton: { marginTop: 10 },
  backText: { color: "#2563EB", fontWeight: "600" },
  content: { padding: 16, gap: 12 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
  },
  kpiLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  section: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  rowValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
  empty: { fontSize: 13, color: "#6B7280" },
});
