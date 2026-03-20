/**
 * Componente de Últimas Compras e Vendas
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useProducts } from "../../contexts/ProductsContext";
import { formatCurrencyBRL } from "../../utils/formatters";

interface UltimasMovimentacoesProps {
  productId: string;
  productName: string;
}

export function UltimasMovimentacoes({
  productId,
  productName,
}: UltimasMovimentacoesProps) {
  const { historicoMovimentacao, isLoadingHistorico, obterHistorico } =
    useProducts();
  const [ultimaCompra, setUltimaCompra] = useState<any>(null);
  const [ultimaVenda, setUltimaVenda] = useState<any>(null);

  useEffect(() => {
    carregarMovimentacoes();
  }, [productId]);

  const carregarMovimentacoes = async () => {
    try {
      await obterHistorico(productId);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    }
  };

  useEffect(() => {
    if (historicoMovimentacao.length > 0) {
      // Encontrar última compra (entrada)
      const compra = historicoMovimentacao.find((m) =>
        m.tipo.includes("entrada"),
      );
      setUltimaCompra(compra || null);

      // Encontrar última venda (saída)
      const venda = historicoMovimentacao.find((m) => m.tipo.includes("saida"));
      setUltimaVenda(venda || null);
    }
  }, [historicoMovimentacao]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Últimas Movimentações</Text>

      {isLoadingHistorico ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.movimentacoesContainer}>
          {/* Última Compra */}
          <View style={styles.movimentacaoCard}>
            <View style={styles.movimentacaoHeader}>
              <Text style={styles.movimentacaoIcon}>📥</Text>
              <Text style={styles.movimentacaoTipo}>Última Compra</Text>
            </View>

            {ultimaCompra ? (
              <>
                <View style={styles.movimentacaoRow}>
                  <Text style={styles.label}>Data:</Text>
                  <Text style={styles.value}>
                    {new Date(ultimaCompra.data).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View style={styles.movimentacaoRow}>
                  <Text style={styles.label}>Quantidade:</Text>
                  <Text style={[styles.value, styles.quantity]}>
                    +{ultimaCompra.quantidade}
                  </Text>
                </View>
                {ultimaCompra.fornecedorId && (
                  <View style={styles.movimentacaoRow}>
                    <Text style={styles.label}>Fornecedor:</Text>
                    <Text style={styles.value} numberOfLines={1}>
                      {ultimaCompra.fornecedorId}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyMessage}>Nenhuma compra registrada</Text>
            )}
          </View>

          {/* Última Venda */}
          <View style={styles.movimentacaoCard}>
            <View style={styles.movimentacaoHeader}>
              <Text style={styles.movimentacaoIcon}>📤</Text>
              <Text style={styles.movimentacaoTipo}>Última Venda</Text>
            </View>

            {ultimaVenda ? (
              <>
                <View style={styles.movimentacaoRow}>
                  <Text style={styles.label}>Data:</Text>
                  <Text style={styles.value}>
                    {new Date(ultimaVenda.data).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View style={styles.movimentacaoRow}>
                  <Text style={styles.label}>Quantidade:</Text>
                  <Text style={[styles.value, styles.quantityNegative]}>
                    -{ultimaVenda.quantidade}
                  </Text>
                </View>
                {ultimaVenda.clienteId && (
                  <View style={styles.movimentacaoRow}>
                    <Text style={styles.label}>Cliente:</Text>
                    <Text style={styles.value} numberOfLines={1}>
                      {ultimaVenda.clienteId}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyMessage}>Nenhuma venda registrada</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  movimentacoesContainer: {
    gap: 12,
  },
  movimentacaoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  movimentacaoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  movimentacaoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  movimentacaoTipo: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  movimentacaoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  value: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  quantity: {
    color: "#10B981",
  },
  quantityNegative: {
    color: "#DC2626",
  },
  emptyMessage: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
});
