import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Fornecedor } from "../../domains/fornecedores/types";
import { useSuppliers } from "../../contexts/SuppliersContext";
import { useProducts } from "../../contexts/ProductsContext";
import {
  fetchAddressByCEP,
  fetchCNPJData,
  fetchCPFData,
  validateCNPJFormat,
  validateCPFFormat,
} from "../../utils/brazilData";
import {
  cleanFormat,
  formatCNPJ,
  formatCPF,
  formatPhone,
  formatZipCode,
} from "../../utils/formatters";

interface SupplierFormProps {
  fornecedor?: Fornecedor;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const PHONE_REGEX = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
const CEP_REGEX = /^\d{5}-\d{3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) return formatCPF(digits.slice(0, 11));
  return formatCNPJ(digits.slice(0, 14));
}

export function SupplierForm({
  fornecedor,
  onSuccess,
  onCancel,
}: SupplierFormProps) {
  const {
    createFornecedor,
    updateFornecedor,
    verificarDocumentoFornecedor,
    isLoading,
  } = useSuppliers();
  const { products, loadProducts, isLoadingProducts } = useProducts();

  const [formData, setFormData] = useState({
    nome: "",
    cpfCnpj: "",
    telefone: "",
    email: "",
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    cep: "",
    prazoEntrega: "",
    condicaoPagamento: "",
    status: "ativo" as "ativo" | "bloqueado",
    produtosFornecidos: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingDocument, setCheckingDocument] = useState(false);
  const [isFetchingDocumentData, setIsFetchingDocumentData] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const lastAutoDocumentRef = useRef("");
  const lastAutoCepRef = useRef("");

  useEffect(() => {
    loadProducts().catch((error) => {
      console.error("[SupplierForm] Erro ao carregar produtos:", error);
    });
  }, [loadProducts]);

  useEffect(() => {
    if (fornecedor) return;

    const cleanDocument = cleanFormat(formData.cpfCnpj);

    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      return;
    }

    if (lastAutoDocumentRef.current === cleanDocument) {
      return;
    }

    lastAutoDocumentRef.current = cleanDocument;

    const autoLoadDocumentData = async () => {
      setIsFetchingDocumentData(true);
      try {
        if (cleanDocument.length === 14 && validateCNPJFormat(cleanDocument)) {
          const data = await fetchCNPJData(cleanDocument);
          setFormData((prev) => ({
            ...prev,
            cpfCnpj: formatCNPJ(cleanDocument),
            nome: prev.nome.trim() ? prev.nome : data.name || prev.nome,
            telefone: prev.telefone.trim()
              ? prev.telefone
              : data.phone
                ? formatPhone(data.phone)
                : prev.telefone,
            email: prev.email.trim() ? prev.email : data.email || prev.email,
            rua: prev.rua.trim() ? prev.rua : data.street || prev.rua,
            numero: prev.numero.trim()
              ? prev.numero
              : data.number || prev.numero,
            complemento: prev.complemento.trim()
              ? prev.complemento
              : data.complement || prev.complemento,
            cidade: prev.cidade.trim() ? prev.cidade : data.city || prev.cidade,
            estado: prev.estado.trim()
              ? prev.estado
              : data.state || prev.estado,
            cep: prev.cep.trim()
              ? prev.cep
              : data.zipCode
                ? formatZipCode(data.zipCode)
                : prev.cep,
          }));
        }

        if (cleanDocument.length === 11 && validateCPFFormat(cleanDocument)) {
          const data = await fetchCPFData(cleanDocument);
          if (data.name) {
            setFormData((prev) => ({
              ...prev,
              cpfCnpj: formatCPF(cleanDocument),
              nome: prev.nome.trim() ? prev.nome : data.name,
            }));
          }
        }
      } catch (error) {
        console.warn(
          "[SupplierForm] Falha no carregamento automático por documento:",
          error,
        );
      } finally {
        setIsFetchingDocumentData(false);
      }
    };

    autoLoadDocumentData();
  }, [formData.cpfCnpj, fornecedor]);

  useEffect(() => {
    const cleanCep = cleanFormat(formData.cep);

    if (cleanCep.length !== 8) {
      return;
    }

    if (lastAutoCepRef.current === cleanCep) {
      return;
    }

    lastAutoCepRef.current = cleanCep;

    const autoLoadCepData = async () => {
      setIsFetchingCep(true);
      try {
        const data = await fetchAddressByCEP(cleanCep);

        setFormData((prev) => ({
          ...prev,
          cep: formatZipCode(cleanCep),
          rua: prev.rua.trim() ? prev.rua : data.street || prev.rua,
          complemento: prev.complemento.trim()
            ? prev.complemento
            : data.complement || prev.complemento,
          cidade: prev.cidade.trim() ? prev.cidade : data.city || prev.cidade,
          estado: prev.estado.trim() ? prev.estado : data.state || prev.estado,
        }));
      } catch (error) {
        console.warn(
          "[SupplierForm] Falha no carregamento automático por CEP:",
          error,
        );
      } finally {
        setIsFetchingCep(false);
      }
    };

    autoLoadCepData();
  }, [formData.cep]);

  useEffect(() => {
    if (!fornecedor) return;

    setFormData({
      nome: fornecedor.nome,
      cpfCnpj: fornecedor.cpfCnpj,
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      rua: fornecedor.endereco?.rua || "",
      numero: fornecedor.endereco?.numero || "",
      complemento: fornecedor.endereco?.complemento || "",
      cidade: fornecedor.endereco?.cidade || "",
      estado: fornecedor.endereco?.estado || "",
      cep: fornecedor.endereco?.cep || "",
      prazoEntrega: fornecedor.prazoEntrega || "",
      condicaoPagamento: fornecedor.condicaoPagamento || "",
      status: fornecedor.status === "bloqueado" ? "bloqueado" : "ativo",
      produtosFornecidos: fornecedor.produtosFornecidos || [],
    });
  }, [fornecedor]);

  const selectedProducts = useMemo(
    () =>
      products.filter((product) =>
        formData.produtosFornecidos.includes(product.productId),
      ),
    [products, formData.produtosFornecidos],
  );

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleProduct = (productId: string) => {
    const has = formData.produtosFornecidos.includes(productId);
    updateField(
      "produtosFornecidos",
      has
        ? formData.produtosFornecidos.filter((id) => id !== productId)
        : [...formData.produtosFornecidos, productId],
    );
  };

  const validateDocumentUniqueness = async () => {
    if (fornecedor && fornecedor.cpfCnpj === formData.cpfCnpj) {
      return true;
    }

    setCheckingDocument(true);
    try {
      const exists = await verificarDocumentoFornecedor(
        formData.cpfCnpj,
        fornecedor?.id,
      );
      return !exists;
    } finally {
      setCheckingDocument(false);
    }
  };

  const validate = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!formData.cpfCnpj.trim()) newErrors.cpfCnpj = "CPF/CNPJ é obrigatório";
    if (!formData.telefone.trim())
      newErrors.telefone = "Telefone é obrigatório";
    if (!formData.rua.trim()) newErrors.rua = "Rua é obrigatória";
    if (!formData.numero.trim()) newErrors.numero = "Número é obrigatório";
    if (!formData.cidade.trim()) newErrors.cidade = "Cidade é obrigatória";
    if (!formData.estado.trim() || formData.estado.trim().length !== 2) {
      newErrors.estado = "Estado deve ter 2 caracteres";
    }
    if (!formData.cep.trim()) newErrors.cep = "CEP é obrigatório";

    if (
      !CPF_REGEX.test(formData.cpfCnpj) &&
      !CNPJ_REGEX.test(formData.cpfCnpj)
    ) {
      newErrors.cpfCnpj = "Documento inválido. Use CPF ou CNPJ formatado";
    }

    if (
      CPF_REGEX.test(formData.cpfCnpj) &&
      !validateCPFFormat(formData.cpfCnpj)
    ) {
      newErrors.cpfCnpj = "CPF inválido";
    }

    if (
      CNPJ_REGEX.test(formData.cpfCnpj) &&
      !validateCNPJFormat(formData.cpfCnpj)
    ) {
      newErrors.cpfCnpj = "CNPJ inválido";
    }

    if (!PHONE_REGEX.test(formData.telefone)) {
      newErrors.telefone = "Telefone inválido. Use (11) 99999-9999";
    }

    if (!CEP_REGEX.test(formData.cep)) {
      newErrors.cep = "CEP inválido. Use 00000-000";
    }

    if (formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = "E-mail inválido";
    }

    if (!newErrors.cpfCnpj) {
      const unique = await validateDocumentUniqueness();
      if (!unique) {
        newErrors.cpfCnpj = "Documento já cadastrado nesta empresa";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const valid = await validate();
    if (!valid) {
      Alert.alert("Validação", "Corrija os campos antes de salvar");
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      cpfCnpj: formData.cpfCnpj.trim(),
      telefone: formData.telefone.trim(),
      email: formData.email.trim() || undefined,
      endereco: {
        rua: formData.rua.trim(),
        numero: formData.numero.trim(),
        complemento: formData.complemento.trim() || undefined,
        cidade: formData.cidade.trim(),
        estado: formData.estado.trim().toUpperCase(),
        cep: formData.cep.trim(),
      },
      prazoEntrega: formData.prazoEntrega.trim() || undefined,
      condicaoPagamento: formData.condicaoPagamento.trim() || undefined,
      produtosFornecidos: formData.produtosFornecidos,
      historicoCompras: fornecedor?.historicoCompras || [],
    };

    try {
      if (fornecedor) {
        await updateFornecedor(fornecedor.id, {
          ...payload,
          status: formData.status,
        });
        Alert.alert("Sucesso", "Fornecedor atualizado com sucesso", [
          { text: "OK", onPress: onSuccess },
        ]);
      } else {
        await createFornecedor(payload);
        Alert.alert("Sucesso", "Fornecedor cadastrado com sucesso", [
          { text: "OK", onPress: onSuccess },
        ]);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao salvar fornecedor";
      Alert.alert("Erro", msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      style={styles.container}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dados principais</Text>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={[
                styles.input,
                errors.nome ? styles.inputError : undefined,
              ]}
              value={formData.nome}
              onChangeText={(text) => updateField("nome", text)}
              placeholder="Nome do fornecedor"
            />
            {errors.nome ? (
              <Text style={styles.error}>{errors.nome}</Text>
            ) : null}

            <Text style={styles.label}>CPF/CNPJ *</Text>
            <TextInput
              style={[
                styles.input,
                errors.cpfCnpj ? styles.inputError : undefined,
              ]}
              value={formData.cpfCnpj}
              onChangeText={(text) =>
                updateField("cpfCnpj", formatCpfCnpj(text))
              }
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              keyboardType="numeric"
            />
            {isFetchingDocumentData ? (
              <Text style={styles.helperText}>
                Carregando dados automáticos do documento...
              </Text>
            ) : null}
            {errors.cpfCnpj ? (
              <Text style={styles.error}>{errors.cpfCnpj}</Text>
            ) : null}

            <Text style={styles.label}>Telefone *</Text>
            <TextInput
              style={[
                styles.input,
                errors.telefone ? styles.inputError : undefined,
              ]}
              value={formData.telefone}
              onChangeText={(text) =>
                updateField("telefone", formatPhone(text))
              }
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
            />
            {errors.telefone ? (
              <Text style={styles.error}>{errors.telefone}</Text>
            ) : null}

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={[
                styles.input,
                errors.email ? styles.inputError : undefined,
              ]}
              value={formData.email}
              onChangeText={(text) => updateField("email", text)}
              placeholder="fornecedor@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.error}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Endereço</Text>

            <Text style={styles.label}>Rua *</Text>
            <TextInput
              style={[styles.input, errors.rua ? styles.inputError : undefined]}
              value={formData.rua}
              onChangeText={(text) => updateField("rua", text)}
              placeholder="Rua"
            />
            {errors.rua ? <Text style={styles.error}>{errors.rua}</Text> : null}

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Número *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.numero ? styles.inputError : undefined,
                  ]}
                  value={formData.numero}
                  onChangeText={(text) => updateField("numero", text)}
                  placeholder="123"
                />
                {errors.numero ? (
                  <Text style={styles.error}>{errors.numero}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CEP *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.cep ? styles.inputError : undefined,
                  ]}
                  value={formData.cep}
                  onChangeText={(text) =>
                    updateField("cep", formatZipCode(text))
                  }
                  placeholder="00000-000"
                  keyboardType="numeric"
                />
                {isFetchingCep ? (
                  <Text style={styles.helperText}>
                    Carregando endereço pelo CEP...
                  </Text>
                ) : null}
                {errors.cep ? (
                  <Text style={styles.error}>{errors.cep}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 2, marginRight: 8 }}>
                <Text style={styles.label}>Cidade *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.cidade ? styles.inputError : undefined,
                  ]}
                  value={formData.cidade}
                  onChangeText={(text) => updateField("cidade", text)}
                  placeholder="Cidade"
                />
                {errors.cidade ? (
                  <Text style={styles.error}>{errors.cidade}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>UF *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.estado ? styles.inputError : undefined,
                  ]}
                  value={formData.estado}
                  onChangeText={(text) =>
                    updateField("estado", text.toUpperCase())
                  }
                  placeholder="SP"
                  maxLength={2}
                />
                {errors.estado ? (
                  <Text style={styles.error}>{errors.estado}</Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.label}>Complemento</Text>
            <TextInput
              style={styles.input}
              value={formData.complemento}
              onChangeText={(text) => updateField("complemento", text)}
              placeholder="Complemento"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Condições comerciais</Text>

            <Text style={styles.label}>Prazo de entrega</Text>
            <TextInput
              style={styles.input}
              value={formData.prazoEntrega}
              onChangeText={(text) => updateField("prazoEntrega", text)}
              placeholder="Ex: 7 dias"
            />

            <Text style={styles.label}>Condição de pagamento</Text>
            <TextInput
              style={styles.input}
              value={formData.condicaoPagamento}
              onChangeText={(text) => updateField("condicaoPagamento", text)}
              placeholder="Ex: 30/60 dias"
            />

            <Text style={styles.label}>Produtos fornecidos</Text>
            {isLoadingProducts ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <View style={styles.chipsWrap}>
                {products.map((product) => {
                  const selected = formData.produtosFornecidos.includes(
                    product.productId,
                  );
                  return (
                    <TouchableOpacity
                      key={product.productId}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleProduct(product.productId)}
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
            )}

            {selectedProducts.length > 0 ? (
              <Text style={styles.helperText}>
                Selecionados:{" "}
                {selectedProducts.map((item) => item.name).join(", ")}
              </Text>
            ) : (
              <Text style={styles.helperText}>
                Nenhum produto vinculado ainda
              </Text>
            )}

            <Text style={styles.label}>Status</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status === "ativo" && styles.statusButtonActive,
                ]}
                onPress={() => updateField("status", "ativo")}
                disabled={!fornecedor}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status === "ativo" &&
                      styles.statusButtonTextActive,
                  ]}
                >
                  Ativo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status === "bloqueado" && styles.statusButtonActive,
                ]}
                onPress={() => updateField("status", "bloqueado")}
                disabled={!fornecedor}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status === "bloqueado" &&
                      styles.statusButtonTextActive,
                  ]}
                >
                  Bloqueado
                </Text>
              </TouchableOpacity>
            </View>
            {!fornecedor ? (
              <Text style={styles.helperText}>
                O bloqueio pode ser alterado após o cadastro.
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isLoading || checkingDocument) && styles.disabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || checkingDocument}
          >
            {isLoading || checkingDocument ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>
                {fornecedor ? "Atualizar" : "Criar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  header: {
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  content: { padding: 16, paddingBottom: 96, gap: 12 },
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
  label: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 6,
    fontWeight: "600",
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#DC2626" },
  error: { color: "#DC2626", fontSize: 12, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center" },
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
  helperText: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
    marginTop: 4,
  },
  statusButtonActive: { borderColor: "#2563EB", backgroundColor: "#DBEAFE" },
  statusButtonText: { color: "#4B5563", fontWeight: "600", fontSize: 12 },
  statusButtonTextActive: { color: "#1D4ED8" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  cancelText: { color: "#1F2937", fontWeight: "700" },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#2563EB",
    minHeight: 44,
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
