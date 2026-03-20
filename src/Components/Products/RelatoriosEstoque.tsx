/**
 * Componente de Relatórios de Estoque
 * Exibe: Produtos mais vendidos, Giro de estoque, Estoque crítico
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { useProducts } from "../../contexts/ProductsContext";
import {
  RelatorioEstoque,
  RelatorioProdutosMaisVendidos,
  RelatorioGiroEstoque,
} from "../../domains/produtos/movimentacao";
import { formatCurrencyBRL } from "../../utils/formatters";

const windowWidth = Dimensions.get("window").width;

type AbaRelatorio = "estoque" | "vendas" | "giro";

export function RelatoriosEstoque() {
  const {
    relatorioEstoque,
    relatorioProdutosMaisVendidos,
    relatorioGiroEstoque,
    gerarRelatorioEstoque,
    gerarRelatorioProdutosMaisVendidos,
    gerarRelatorioGiroEstoque,
  } = useProducts();

  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>("estoque");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarRelatorios();
  }, []);

  const carregarRelatorios = async () => {
    setLoading(true);
    try {
      await Promise.all([
        gerarRelatorioEstoque(),
        gerarRelatorioProdutosMaisVendidos(30),
        gerarRelatorioGiroEstoque(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Abas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, abaAtiva === "estoque" && styles.tabActive]}
          onPress={() => setAbaAtiva("estoque")}
        >
          <Text
            style={[
              styles.tabText,
              abaAtiva === "estoque" && styles.tabTextActive,
            ]}
          >
            Estoque
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, abaAtiva === "vendas" && styles.tabActive]}
          onPress={() => setAbaAtiva("vendas")}
        >
          <Text
            style={[
              styles.tabText,
              abaAtiva === "vendas" && styles.tabTextActive,
            ]}
          >
            Vendas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, abaAtiva === "giro" && styles.tabActive]}
          onPress={() => setAbaAtiva("giro")}
        >
          <Text
            style={[
              styles.tabText,
              abaAtiva === "giro" && styles.tabTextActive,
            ]}
          >
            Giro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Refresh button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={carregarRelatorios}
        disabled={loading}
      >
        <Text style={styles.refreshIcon}>{loading ? "⏳" : "🔄"}</Text>
        <Text style={styles.refreshText}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Text>
      </TouchableOpacity>

      {/* Conteúdo */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {abaAtiva === "estoque" && (
          <RelatorioEstoqueView dados={relatorioEstoque} loading={loading} />
        )}

        {abaAtiva === "vendas" && (
          <RelatorioProdutosMaisVendidosView
            dados={relatorioProdutosMaisVendidos}
            loading={loading}
          />
        )}

        {abaAtiva === "giro" && (
          <RelatorioGiroEstoqueView
            dados={relatorioGiroEstoque}
            loading={loading}
          />
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Relatório de Estoque - Mostra status de todos os produtos
 */
function RelatorioEstoqueView({
  dados,
  loading,
}: {
  dados: RelatorioEstoque[];
  loading: boolean;
}) {
  if (loading || dados.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Nenhum produto cadastrado</Text>
          </>
        )}
      </View>
    );
  }

  // Agrupar por status
  const criticos = dados.filter((d) => d.status === "critico");
  const baixos = dados.filter((d) => d.status === "baixo");
  const normais = dados.filter((d) => d.status === "normal");
  const excesso = dados.filter((d) => d.status === "excesso");

  return (
    <View style={styles.relatorioContainer}>
      {/* Cards de resumo */}
      <View style={styles.resumoCards}>
        <ResumoCard
          titulo="Crítico"
          valor={String(criticos.length)}
          cor="#DC2626"
          icon="🔴"
        />
        <ResumoCard
          titulo="Baixo"
          valor={String(baixos.length)}
          cor="#F59E0B"
          icon="🟡"
        />
        <ResumoCard
          titulo="Normal"
          valor={String(normais.length)}
          cor="#10B981"
          icon="🟢"
        />
        <ResumoCard
          titulo="Excesso"
          valor={String(excesso.length)}
          cor="#3B82F6"
          icon="🔵"
        />
      </View>

      {/* Produtos por status */}
      {criticos.length > 0 && (
        <StatusGroupe
          status="critico"
          titulo="❌ Crítico"
          cor="#DC2626"
          produtos={criticos}
        />
      )}
      {baixos.length > 0 && (
        <StatusGroupe
          status="baixo"
          titulo="⚠️ Baixo"
          cor="#F59E0B"
          produtos={baixos}
        />
      )}
      {normais.length > 0 && (
        <StatusGroupe
          status="normal"
          titulo="✅ Normal"
          cor="#10B981"
          produtos={normais}
        />
      )}
      {excesso.length > 0 && (
        <StatusGroupe
          status="excesso"
          titulo="📈 Excesso"
          cor="#3B82F6"
          produtos={excesso}
        />
      )}
    </View>
  );
}

/**
 * Relatório de Produtos Mais Vendidos
 */
function RelatorioProdutosMaisVendidosView({
  dados,
  loading,
}: {
  dados: RelatorioProdutosMaisVendidos[];
  loading: boolean;
}) {
  if (loading || dados.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyText}>
              Nenhuma venda nos últimos 30 dias
            </Text>
          </>
        )}
      </View>
    );
  }

  const totalReceita = dados.reduce((sum, d) => sum + d.receita, 0);

  return (
    <View style={styles.relatorioContainer}>
      <View style={styles.vendasResumo}>
        <Text style={styles.vendasTotal}>
          Receita Total: {formatCurrencyBRL(totalReceita)}
        </Text>
        <Text style={styles.vendasPeriodo}>Últimos 30 dias</Text>
      </View>

      {dados.map((produto, index) => (
        <View key={produto.produtoId} style={styles.vendaItem}>
          <View style={styles.vendaRank}>
            <Text style={styles.vendaRankText}>#{index + 1}</Text>
          </View>
          <View style={styles.vendaInfo}>
            <Text style={styles.vendaNome}>{produto.nomeProduto}</Text>
            <Text style={styles.vendaStats}>
              {produto.quantidadeVendida} un. •{" "}
              {formatCurrencyBRL(produto.receita)}
            </Text>
          </View>
          <View style={styles.vendaPercent}>
            <View
              style={[
                styles.percentBar,
                {
                  width: `${produto.percentualReceita}%`,
                  backgroundColor: "#3B82F6",
                },
              ]}
            />
            <Text style={styles.percentText}>
              {produto.percentualReceita.toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Relatório de Giro de Estoque
 */
function RelatorioGiroEstoqueView({
  dados,
  loading,
}: {
  dados: RelatorioGiroEstoque[];
  loading: boolean;
}) {
  if (loading || dados.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <>
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={styles.emptyText}>
              Nenhum produto com movimentação
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.relatorioContainer}>
      {dados.map((produto) => {
        const statusGiro =
          produto.giroEstoque > 2
            ? "alto"
            : produto.giroEstoque > 0.5
              ? "normal"
              : "baixo";
        const corGiro =
          statusGiro === "alto"
            ? "#10B981"
            : statusGiro === "normal"
              ? "#F59E0B"
              : "#DC2626";

        return (
          <View key={produto.produtoId} style={styles.giroItem}>
            <View style={styles.giroLeft}>
              <Text style={styles.giroNome}>{produto.nomeProduto}</Text>
              <View style={styles.giroStats}>
                <Text style={styles.giroStat}>
                  Vendido: {produto.vendidoUltimos30Dias} un.
                </Text>
                <Text style={styles.giroStat}>
                  Estoque: {produto.estoqueAtual} un.
                </Text>
              </View>
            </View>
            <View style={styles.giroRight}>
              <View style={[styles.giroBadge, { borderColor: corGiro }]}>
                <Text style={{ color: corGiro, fontWeight: "700" }}>
                  {produto.giroEstoque.toFixed(2)}x
                </Text>
              </View>
              <Text style={styles.giroDias}>
                {produto.diasParaEsgotar} dias
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Componente auxiliar - Card de Resumo
 */
function ResumoCard({
  titulo,
  valor,
  cor,
  icon,
}: {
  titulo: string;
  valor: string;
  cor: string;
  icon: string;
}) {
  return (
    <View style={[styles.resumoCard, { borderLeftColor: cor }]}>
      <Text style={styles.resumoIcon}>{icon}</Text>
      <Text style={styles.resumoValor}>{valor}</Text>
      <Text style={styles.resumoTitulo}>{titulo}</Text>
    </View>
  );
}

/**
 * Componente auxiliar - Grupo de Status
 */
function StatusGroupe({
  status,
  titulo,
  cor,
  produtos,
}: {
  status: string;
  titulo: string;
  cor: string;
  produtos: RelatorioEstoque[];
}) {
  return (
    <View style={styles.statusGroup}>
      <Text style={[styles.statusTitle, { color: cor }]}>{titulo}</Text>
      {produtos.map((p) => (
        <View key={p.produtoId} style={styles.produtoItem}>
          <View style={styles.produtoNomeBox}>
            <Text style={styles.produtoNome}>{p.nomeProduto}</Text>
            <Text style={styles.produtoEstoque}>
              {p.estoqueAtual} / {p.estoqueMinimo}-{p.estoqueMaximo}
            </Text>
          </View>
          <View style={styles.produtoValor}>
            <Text style={styles.produtoValorText}>
              {formatCurrencyBRL(p.valorTotalEstoque)}
            </Text>
            <Text style={styles.produtoMargem}>
              {p.margemLucro.toFixed(0)}% margem
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
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
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  refreshIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  relatorioContainer: {
    paddingVertical: 8,
  },
  // Resumo de Estoque
  resumoCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  resumoIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  resumoValor: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  resumoTitulo: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  statusGroup: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  produtoItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  produtoNomeBox: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  produtoEstoque: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  produtoValor: {
    alignItems: "flex-end",
  },
  produtoValorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  produtoMargem: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  // Relatório de Vendas
  vendasResumo: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  vendasTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  vendasPeriodo: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  vendaItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  vendaRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vendaRankText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  vendaInfo: {
    flex: 1,
  },
  vendaNome: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  vendaStats: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  vendaPercent: {
    width: 60,
    alignItems: "center",
  },
  percentBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  percentText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  // Relatório de Giro
  giroItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  giroLeft: {
    flex: 1,
  },
  giroNome: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  giroStats: {
    marginTop: 6,
  },
  giroStat: {
    fontSize: 11,
    color: "#6B7280",
  },
  giroRight: {
    alignItems: "center",
  },
  giroBadge: {
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  giroDias: {
    fontSize: 10,
    color: "#6B7280",
  },
});
