import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  useWindowDimensions,
} from "react-native";
import { useProducts } from "../../contexts/ProductsContext";
import { useCompany } from "../../contexts/CompanyContext";
import {
  Product,
  ProductCategory,
  UnidadeMedida,
  OrigemMercadoria,
  CategoriaFiscal,
  ResponsavelReposicao,
  StatusProduto,
} from "../../types";
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from "../../utils/formatters";

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CATEGORY_OPTIONS: ProductCategory[] = ["Produto", "Serviço"];

const UNIT_OPTIONS: UnidadeMedida[] = [
  "UN",
  "CX",
  "PCT",
  "M2",
  "KG",
  "L",
  "H",
  "M",
];

const ORIGEM_OPTIONS: OrigemMercadoria[] = ["importacao", "nacional", "mista"];

const CATEGORIA_FISCAL_OPTIONS: CategoriaFiscal[] = [
  "simples",
  "icms",
  "ipi",
  "iss",
  "isento",
];

const RESPONSAVEL_OPTIONS: ResponsavelReposicao[] = ["empresa", "funcionario"];

const STATUS_OPTIONS: StatusProduto[] = ["ativo", "inativo", "descontinuado"];

const PRICE_SUGGESTIONS = [50, 100, 150, 200, 300, 500];

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { addProduct, updateProduct, isLoadingProducts } = useProducts();
  const { company } = useCompany();
  const [formData, setFormData] = useState({
    // Básicos
    name: "",
    description: "",
    category: "Produto" as ProductCategory,
    unit: "UN" as UnidadeMedida,

    // Preços
    unitPrice: "0,00",
    costPrice: "0,00",

    // Estoque
    currentStock: "0",
    minimumStock: "0",
    maximumStock: "0",

    // Fiscal
    originMerchandise: "nacional" as OrigemMercadoria,
    hasTax: false,
    taxCategory: "simples" as CategoriaFiscal,
    generatesInvoice: true,

    // Custos adicionais
    additionalCost: "0,00",

    // Reposição
    replenishmentResponsible: "empresa" as ResponsavelReposicao,

    // Status
    status: "ativo" as StatusProduto,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    category: false,
    unit: false,
    origin: false,
    taxCategory: false,
    responsible: false,
    status: false,
    priceSuggestions: false,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        category: product.category,
        unit: product.unit,
        unitPrice: formatCurrencyInput(
          String(Math.round((product.unitPrice || 0) * 100)),
        ),
        costPrice: formatCurrencyInput(
          String(Math.round((product.costPrice || 0) * 100)),
        ),
        currentStock: String(product.currentStock || 0),
        minimumStock: String(product.minimumStock || 0),
        maximumStock: String(product.maximumStock || 0),
        originMerchandise: product.originMerchandise || "nacional",
        hasTax: product.hasTax || false,
        taxCategory: product.taxCategory || "simples",
        generatesInvoice: product.generatesInvoice !== false,
        additionalCost: formatCurrencyInput(
          String(Math.round((product.additionalCost || 0) * 100)),
        ),
        replenishmentResponsible: product.replenishmentResponsible || "empresa",
        status: product.status,
      });
    }
  }, [product]);

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => ({
      ...Object.keys(prev).reduce(
        (acc, k) => {
          acc[k] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
      [key]: !prev[key],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";

    const price = parseCurrencyInput(formData.unitPrice);
    if (Number.isNaN(price)) newErrors.unitPrice = "Preço de venda inválido";
    if (price <= 0) newErrors.unitPrice = "Preço de venda deve ser > 0";

    const cost = parseCurrencyInput(formData.costPrice);
    if (Number.isNaN(cost)) newErrors.costPrice = "Preço de compra inválido";
    if (cost < 0) newErrors.costPrice = "Preço de compra não pode ser negativo";

    const minStock = parseInt(formData.minimumStock, 10);
    if (Number.isNaN(minStock))
      newErrors.minimumStock = "Estoque mínimo inválido";

    const maxStock = parseInt(formData.maximumStock, 10);
    if (Number.isNaN(maxStock))
      newErrors.maximumStock = "Estoque máximo inválido";

    if (minStock >= maxStock) {
      newErrors.minimumStock = "Mínimo deve ser menor que máximo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validação", "Verifique os erros no formulário");
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unit: formData.unit,
        unitPrice: parseCurrencyInput(formData.unitPrice),
        costPrice: parseCurrencyInput(formData.costPrice),
        currentStock: parseInt(formData.currentStock, 10),
        minimumStock: parseInt(formData.minimumStock, 10),
        maximumStock: parseInt(formData.maximumStock, 10),
        originMerchandise: formData.originMerchandise,
        hasTax: formData.hasTax,
        taxCategory: formData.taxCategory,
        generatesInvoice: formData.generatesInvoice,
        additionalCost: parseCurrencyInput(formData.additionalCost),
        replenishmentResponsible: formData.replenishmentResponsible,
        status: formData.status,
        companyId: company?.companyId || "",
        active: true,
      } as Product;

      if (product) {
        await updateProduct(product.productId, productData);
        Alert.alert("Sucesso", "Produto atualizado!", [
          { text: "OK", onPress: onSuccess },
        ]);
      } else {
        await addProduct(productData);
        Alert.alert("Sucesso", "Produto criado!", [
          { text: "OK", onPress: onSuccess },
        ]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao salvar";
      Alert.alert("Erro", msg);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePriceChange = (text: string, field: string) => {
    updateField(field, formatCurrencyInput(text));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {product ? "Editar Produto" : "Novo Produto"}
          </Text>
        </View>

        {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Informações Básicas</Text>

          <View style={styles.inputGroup}>
            <Label text="Nome do Produto/Serviço *" />
            <TextInput
              style={[
                styles.input,
                errors.name ? styles.inputError : undefined,
              ]}
              placeholder="Ex: Manutenção de HVAC"
              value={formData.name}
              onChangeText={(text) => updateField("name", text)}
              editable={!isLoadingProducts}
            />
            {errors.name && <ErrorText text={errors.name} />}
          </View>

          <View style={styles.inputGroup}>
            <Label text="Descrição" />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição detalhada (opcional)"
              value={formData.description}
              onChangeText={(text) => updateField("description", text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Tipo *" />
              <Dropdown
                value={formData.category}
                options={CATEGORY_OPTIONS}
                onSelect={(value) => {
                  updateField("category", value);
                  toggleDropdown("category");
                }}
                isOpen={openDropdowns.category}
                onToggle={() => toggleDropdown("category")}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Unidade *" />
              <Dropdown
                value={formData.unit}
                options={UNIT_OPTIONS}
                onSelect={(value) => {
                  updateField("unit", value);
                  toggleDropdown("unit");
                }}
                isOpen={openDropdowns.unit}
                onToggle={() => toggleDropdown("unit")}
              />
            </View>
          </View>
        </View>

        {/* SEÇÃO 2: PREÇOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Preços</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Preço de Compra (Custo)" />
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={[
                    styles.priceInput,
                    errors.costPrice ? styles.inputError : undefined,
                  ]}
                  placeholder="0,00"
                  value={formData.costPrice}
                  onChangeText={(text) => handlePriceChange(text, "costPrice")}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.costPrice && <ErrorText text={errors.costPrice} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Preço de Venda *" />
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={[
                    styles.priceInput,
                    errors.unitPrice ? styles.inputError : undefined,
                  ]}
                  placeholder="0,00"
                  value={formData.unitPrice}
                  onChangeText={(text) => handlePriceChange(text, "unitPrice")}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.unitPrice && <ErrorText text={errors.unitPrice} />}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Label text="Custo Adicional (Embalagem, etc)" />
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>R$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0,00"
                value={formData.additionalCost}
                onChangeText={(text) =>
                  handlePriceChange(text, "additionalCost")
                }
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Quick prices */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.selectTrigger}
              onPress={() => toggleDropdown("priceSuggestions")}
            >
              <Text style={styles.selectTriggerText}>Preços sugeridos</Text>
              <Text style={styles.selectTriggerIcon}>
                {openDropdowns.priceSuggestions ? "▴" : "▾"}
              </Text>
            </TouchableOpacity>

            {openDropdowns.priceSuggestions && (
              <View style={styles.quickPriceContainer}>
                {PRICE_SUGGESTIONS.map((price) => {
                  const priceValue = formatCurrencyInput(String(price * 100));
                  return (
                    <TouchableOpacity
                      key={price}
                      style={styles.quickPriceChip}
                      onPress={() => {
                        updateField("unitPrice", priceValue);
                        toggleDropdown("priceSuggestions");
                      }}
                    >
                      <Text style={styles.quickPriceText}>R$ {priceValue}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* SEÇÃO 3: ESTOQUE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Controle de Estoque</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Estoque Atual" />
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.currentStock}
                onChangeText={(text) => updateField("currentStock", text)}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Mínimo *" />
              <TextInput
                style={[
                  styles.input,
                  errors.minimumStock ? styles.inputError : undefined,
                ]}
                placeholder="0"
                value={formData.minimumStock}
                onChangeText={(text) => updateField("minimumStock", text)}
                keyboardType="number-pad"
              />
              {errors.minimumStock && <ErrorText text={errors.minimumStock} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Máximo *" />
              <TextInput
                style={[
                  styles.input,
                  errors.maximumStock ? styles.inputError : undefined,
                ]}
                placeholder="0"
                value={formData.maximumStock}
                onChangeText={(text) => updateField("maximumStock", text)}
                keyboardType="number-pad"
              />
              {errors.maximumStock && <ErrorText text={errors.maximumStock} />}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Responsável pela Reposição" />
              <Dropdown
                value={formData.replenishmentResponsible}
                options={RESPONSAVEL_OPTIONS}
                onSelect={(value) => {
                  updateField("replenishmentResponsible", value);
                  toggleDropdown("responsible");
                }}
                isOpen={openDropdowns.responsible}
                onToggle={() => toggleDropdown("responsible")}
              />
            </View>
          </View>
        </View>

        {/* SEÇÃO 4: FISCAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏛️ Informações Fiscais</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Origem da Mercadoria" />
              <Dropdown
                value={formData.originMerchandise}
                options={ORIGEM_OPTIONS}
                onSelect={(value) => {
                  updateField("originMerchandise", value);
                  toggleDropdown("origin");
                }}
                isOpen={openDropdowns.origin}
                onToggle={() => toggleDropdown("origin")}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Categoria Fiscal" />
              <Dropdown
                value={formData.taxCategory}
                options={CATEGORIA_FISCAL_OPTIONS}
                onSelect={(value) => {
                  updateField("taxCategory", value);
                  toggleDropdown("taxCategory");
                }}
                isOpen={openDropdowns.taxCategory}
                onToggle={() => toggleDropdown("taxCategory")}
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.label}>Possui Imposto</Text>
            </View>
            <Switch
              value={formData.hasTax}
              onValueChange={(value) => updateField("hasTax", value)}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.label}>Gera Nota Fiscal</Text>
            </View>
            <Switch
              value={formData.generatesInvoice}
              onValueChange={(value) => updateField("generatesInvoice", value)}
            />
          </View>
        </View>

        {/* SEÇÃO 5: STATUS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Status</Text>

          <View style={styles.inputGroup}>
            <Label text="Status do Produto" />
            <Dropdown
              value={formData.status}
              options={STATUS_OPTIONS}
              onSelect={(value) => {
                updateField("status", value);
                toggleDropdown("status");
              }}
              isOpen={openDropdowns.status}
              onToggle={() => toggleDropdown("status")}
            />
          </View>
        </View>

        {/* BOTÕES */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isLoadingProducts}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              isLoadingProducts ? styles.submitButtonDisabled : undefined,
            ]}
            onPress={handleSubmit}
            disabled={isLoadingProducts}
          >
            {isLoadingProducts ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {product ? "Atualizar" : "Salvar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ErrorText({ text }: { text: string }) {
  return <Text style={styles.errorField}>{text}</Text>;
}

interface DropdownProps {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function Dropdown({
  value,
  options,
  onSelect,
  isOpen,
  onToggle,
}: DropdownProps) {
  const { height: screenHeight } = useWindowDimensions();
  const dropdownMaxHeight = Math.max(
    180,
    Math.min(360, Math.floor(screenHeight * 0.4)),
  );

  return (
    <View style={[styles.dropdownContainer, isOpen && styles.dropdownOpen]}>
      <TouchableOpacity style={styles.selectTrigger} onPress={onToggle}>
        <Text style={styles.selectTriggerText} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.selectTriggerIcon}>{isOpen ? "▴" : "▾"}</Text>
      </TouchableOpacity>

      {isOpen && (
        <ScrollView
          style={[styles.selectOptionsPanel, { maxHeight: dropdownMaxHeight }]}
          contentContainerStyle={styles.selectOptionsContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          persistentScrollbar
          keyboardShouldPersistTaps="handled"
        >
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.selectOption,
                value === option && styles.selectOptionActive,
              ]}
              onPress={() => onSelect(option)}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  value === option && styles.selectOptionTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 16,
  },
  dropdownContainer: {
    position: "relative",
    zIndex: 1,
  },
  dropdownOpen: {
    zIndex: 60,
    elevation: 60,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleLabel: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  textArea: {
    height: 80,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  selectTrigger: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectTriggerText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  selectTriggerIcon: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  selectOptionsPanel: {
    marginTop: 8,
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    zIndex: 70,
    elevation: 70,
    overflow: "hidden",
  },
  selectOptionsContent: {
    padding: 8,
    paddingBottom: 12,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
  },
  selectOptionActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  selectOptionText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  selectOptionTextActive: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  errorField: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  quickPriceContainer: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickPriceChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickPriceChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  quickPriceText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  quickPriceTextActive: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#2563EB",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  spacer: {
    height: 20,
  },
});
