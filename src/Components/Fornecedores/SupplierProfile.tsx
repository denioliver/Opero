import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Fornecedor } from "../../domains/fornecedores/types";
import { useSuppliers } from "../../contexts/SuppliersContext";
import { useProducts } from "../../contexts/ProductsContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import {
  formatCurrencyBRL,
  formatCurrencyInput,
  formatDateBRL,
  parseCurrencyInput,
} from "../../utils/formatters";
import {
  maskAddressLine,
  maskDocument,
  maskEmail,
  maskPhone,
} from "../../utils/privacy";

interface SupplierProfileProps {
  fornecedorId: string;
  onBack?: () => void;
  onEdit?: (fornecedor: Fornecedor) => void;
}

export function SupplierProfile({
  fornecedorId,
  onBack,
  onEdit,
}: SupplierProfileProps) {
  const {
    fornecedorSelecionado,
    selectFornecedor,
    registrarCompraFornecedor,
    isLoading,
  } = useSuppliers();
  const { funcionario } = useFuncionario();
  const { products, loadProducts } = useProducts();
  const shouldMaskSensitiveData = !!funcionario?.readOnlyAccess;
  const canWrite = !funcionario?.readOnlyAccess;
  const [activeTab, setActiveTab] = useState<"dados" | "compras">("dados");

  const [compraValor, setCompraValor] = useState("0,00");
  const [compraDescricao, setCompraDescricao] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    selectFornecedor(fornecedorId).catch((error) => {
      console.error("[SupplierProfile] Erro ao carregar fornecedor:", error);
    });

    loadProducts().catch((error) => {
      console.error("[SupplierProfile] Erro ao carregar produtos:", error);
    });
  }, [fornecedorId, selectFornecedor, loadProducts]);

  const linkedProducts = useMemo(() => {
    if (!fornecedorSelecionado) return [];
    return products.filter((product) =>
      fornecedorSelecionado.produtosFornecidos.includes(product.productId),
    );
  }, [fornecedorSelecionado, products]);

  if (isLoading && !fornecedorSelecionado) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!fornecedorSelecionado) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Fornecedor não encontrado</Text>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const fornecedor = fornecedorSelecionado;
  const historico = [...(fornecedor.historicoCompras || [])].sort((a, b) => {
    const aMs = new Date(a.data as any).getTime();
    const bMs = new Date(b.data as any).getTime();
    return bMs - aMs;
  });

  const totalComprado = historico.reduce(
    (sum, item) => sum + (item.valor || 0),
    0,
  );

  const handleTogglePurchaseProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleRegisterPurchase = async () => {
    const valor = parseCurrencyInput(compraValor);
    if (valor <= 0) {
      Alert.alert("Validação", "Informe um valor de compra maior que zero.");
      return;
    }

    try {
      await registrarCompraFornecedor(fornecedor.id, {
        data: new Date(),
        valor,
        descricao: compraDescricao.trim() || undefined,
        produtoIds:
          selectedProductIds.length > 0 ? selectedProductIds : undefined,
      });

      await selectFornecedor(fornecedor.id);

      setCompraValor("0,00");
      setCompraDescricao("");
      setSelectedProductIds([]);

      Alert.alert("Sucesso", "Compra registrada no histórico do fornecedor");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao registrar compra";
      Alert.alert("Erro", msg);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>←</Text>
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{fornecedor.nome}</Text>
            <Text style={styles.subtitle}>
              {shouldMaskSensitiveData
                ? maskDocument(fornecedor.cpfCnpj)
                : fornecedor.cpfCnpj}
            </Text>
          </View>
          {onEdit && canWrite ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(fornecedor)}
            >
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.statusText}>Status: {fornecedor.status}</Text>
      </View>

      <View style={styles.tabs}>
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
          style={[styles.tab, activeTab === "compras" && styles.tabActive]}
          onPress={() => setActiveTab("compras")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "compras" && styles.tabTextActive,
            ]}
          >
            Compras
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {shouldMaskSensitiveData && (
          <View style={styles.readonlyBadge}>
            <Text style={styles.readonlyBadgeText}>
              Modo leitura: dados sensíveis ocultos
            </Text>
          </View>
        )}

        {activeTab === "dados" ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contato</Text>
              <InfoRow
                label="Telefone"
                value={
                  shouldMaskSensitiveData
                    ? maskPhone(fornecedor.telefone)
                    : fornecedor.telefone || "—"
                }
              />
              <InfoRow
                label="E-mail"
                value={
                  shouldMaskSensitiveData
                    ? maskEmail(fornecedor.email)
                    : fornecedor.email || "—"
                }
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Endereço</Text>
              <InfoRow
                label="Logradouro"
                value={
                  shouldMaskSensitiveData
                    ? maskAddressLine(
                        fornecedor.endereco
                          ? `${fornecedor.endereco.rua}, ${fornecedor.endereco.numero}`
                          : "",
                      )
                    : fornecedor.endereco
                      ? `${fornecedor.endereco.rua}, ${fornecedor.endereco.numero}`
                      : "—"
                }
              />
              <InfoRow
                label="Cidade/UF"
                value={
                  fornecedor.endereco
                    ? `${fornecedor.endereco.cidade}/${fornecedor.endereco.estado}`
                    : "—"
                }
              />
              <InfoRow
                label="CEP"
                value={
                  shouldMaskSensitiveData
                    ? maskDocument(fornecedor.endereco?.cep)
                    : fornecedor.endereco?.cep || "—"
                }
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Condições</Text>
              <InfoRow
                label="Prazo de entrega"
                value={fornecedor.prazoEntrega || "—"}
              />
              <InfoRow
                label="Condição de pagamento"
                value={fornecedor.condicaoPagamento || "—"}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Produtos fornecidos</Text>
              {linkedProducts.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum produto vinculado</Text>
              ) : (
                linkedProducts.map((product) => (
                  <View key={product.productId} style={styles.productRow}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>{product.category}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Resumo de compras</Text>
              <InfoRow
                label="Qtd. de compras"
                value={String(historico.length)}
              />
              <InfoRow
                label="Total comprado"
                value={
                  shouldMaskSensitiveData
                    ? "Valor oculto"
                    : formatCurrencyBRL(totalComprado)
                }
              />
            </View>

            {canWrite && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Registrar compra</Text>

                <Text style={styles.label}>Valor *</Text>
                <TextInput
                  style={styles.input}
                  value={compraValor}
                  onChangeText={(text) =>
                    setCompraValor(formatCurrencyInput(text))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                />

                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={styles.input}
                  value={compraDescricao}
                  onChangeText={setCompraDescricao}
                  placeholder="Observação da compra"
                />

                <Text style={styles.label}>Produtos vinculados na compra</Text>
                <View style={styles.chipsWrap}>
                  {linkedProducts.map((product) => {
                    const selected = selectedProductIds.includes(
                      product.productId,
                    );
                    return (
                      <TouchableOpacity
                        key={product.productId}
                        style={[styles.chip, selected && styles.chipActive]}
                        onPress={() =>
                          handleTogglePurchaseProduct(product.productId)
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextActive,
                          ]}
                        >
                          {product.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleRegisterPurchase}
                >
                  <Text style={styles.saveButtonText}>Registrar compra</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Histórico de compras</Text>
              {historico.length === 0 ? (
                <Text style={styles.emptyText}>Sem compras registradas.</Text>
              ) : (
                historico.map((compra) => (
                  <View key={compra.id} style={styles.historyItem}>
                    <Text style={styles.historyDate}>
                      {formatDateBRL(compra.data)}
                    </Text>
                    <Text style={styles.historyValue}>
                      {shouldMaskSensitiveData
                        ? "Valor oculto"
                        : formatCurrencyBRL(compra.valor || 0)}
                    </Text>
                    {compra.descricao ? (
                      <Text style={styles.historyDesc}>
                        {shouldMaskSensitiveData
                          ? "Descrição oculta"
                          : compra.descricao}
                      </Text>
                    ) : null}
                    {compra.produtoIds?.length ? (
                      <Text style={styles.historyMeta}>
                        {compra.produtoIds.length} produto(s) associado(s)
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: 34,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { padding: 6 },
  iconButtonText: { fontSize: 22, color: "#2563EB" },
  title: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  editButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: { color: "#fff", fontWeight: "700" },
  statusText: {
    marginTop: 8,
    fontSize: 12,
    color: "#374151",
    textTransform: "capitalize",
  },
  tabs: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#2563EB" },
  tabText: { color: "#6B7280", fontWeight: "500" },
  tabTextActive: { color: "#2563EB", fontWeight: "700" },
  content: { padding: 16, gap: 12 },
  readonlyBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  readonlyBadgeText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  infoValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  productRow: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  productName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  productMeta: { fontSize: 12, color: "#6B7280" },
  label: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { borderColor: "#2563EB", backgroundColor: "#DBEAFE" },
  chipText: { fontSize: 12, color: "#4B5563", fontWeight: "500" },
  chipTextActive: { color: "#1D4ED8", fontWeight: "700" },
  saveButton: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    paddingVertical: 11,
  },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  historyItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  historyDate: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  historyValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 2,
  },
  historyDesc: { fontSize: 12, color: "#374151" },
  historyMeta: { fontSize: 11, color: "#6B7280", marginTop: 3 },
  emptyText: { color: "#6B7280" },
  backButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
  backText: { color: "#111827", fontWeight: "700" },
});
