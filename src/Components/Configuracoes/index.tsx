import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useCompany } from "../../contexts/CompanyContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import {
  cleanFormat,
  formatCNPJ,
  formatPhone,
  formatZipCode,
} from "../../utils/formatters";
import { fetchAddressByCEP } from "../../utils/brazilData";
import {
  maskAddressLine,
  maskDocument,
  maskEmail,
  maskPhone,
} from "../../utils/privacy";

interface CompanyFormState {
  name: string;
  cnpj: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  zipCode: string;
}

const HELP_TOPICS = [
  "Como cadastrar clientes e produtos",
  "Boas práticas para ordens de serviço",
  "Fluxo recomendado para emissão de nota",
];

export const ConfiguracoesScreen: React.FC = () => {
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const { company, updateCompany, isLoadingCompany } = useCompany();

  const [formData, setFormData] = useState<CompanyFormState>({
    name: "",
    cnpj: "",
    ownerName: "",
    ownerEmail: "",
    phone: "",
    email: "",
    street: "",
    number: "",
    complement: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);
  const lastAutoCepRef = useRef("");

  const isProprietario = user?.role === "users";
  const isReadOnlyFuncionario = !!funcionario?.readOnlyAccess;
  const canEditCompany = useMemo(() => {
    if (isReadOnlyFuncionario) return false;
    if (isProprietario) return true;
    return !!funcionario?.canAccessAdminCards;
  }, [isReadOnlyFuncionario, isProprietario, funcionario?.canAccessAdminCards]);

  useEffect(() => {
    if (!company) return;

    setFormData({
      name: company.name || "",
      cnpj: formatCNPJ(company.cnpj || ""),
      ownerName: company.ownerName || "",
      ownerEmail: company.ownerEmail || "",
      phone: formatPhone(company.phone || ""),
      email: company.email || "",
      street: company.address?.street || "",
      number: company.address?.number || "",
      complement: company.address?.complement || "",
      city: company.city || "",
      state: company.state || "",
      zipCode: formatZipCode(company.zipCode || ""),
    });
  }, [company]);

  const updateField = (field: keyof CompanyFormState, value: string) => {
    let nextValue = value;

    if (field === "phone") nextValue = formatPhone(value);
    if (field === "zipCode") nextValue = formatZipCode(value);
    if (field === "state") nextValue = value.toUpperCase();

    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const handleFetchCEPData = async (zipCode: string, silent = false) => {
    const cleanCEP = cleanFormat(zipCode);

    if (cleanCEP.length !== 8) {
      return;
    }

    try {
      setIsFetchingCEP(true);
      const cepData = await fetchAddressByCEP(cleanCEP);

      setFormData((prev) => ({
        ...prev,
        zipCode: formatZipCode(cleanCEP),
        street: prev.street.trim()
          ? prev.street
          : cepData.street || prev.street,
        complement: prev.complement.trim()
          ? prev.complement
          : cepData.complement || prev.complement,
        city: prev.city.trim() ? prev.city : cepData.city || prev.city,
        state: prev.state.trim() ? prev.state : cepData.state || prev.state,
      }));
    } catch (error) {
      if (!silent) {
        Alert.alert(
          "CEP",
          "Não foi possível carregar os dados do CEP informado.",
        );
      }
    } finally {
      setIsFetchingCEP(false);
    }
  };

  useEffect(() => {
    const cleanCEP = cleanFormat(formData.zipCode);

    if (cleanCEP.length !== 8) {
      return;
    }

    if (lastAutoCepRef.current === cleanCEP) {
      return;
    }

    lastAutoCepRef.current = cleanCEP;
    handleFetchCEPData(formData.zipCode, true);
  }, [formData.zipCode]);

  const validateForm = () => {
    if (!formData.phone.trim()) {
      Alert.alert("Validação", "Informe o telefone da empresa.");
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert("Validação", "Informe o e-mail da empresa.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      Alert.alert("Validação", "Informe um e-mail válido.");
      return false;
    }
    if (!formData.street.trim() || !formData.number.trim()) {
      Alert.alert("Validação", "Preencha rua e número do endereço.");
      return false;
    }
    if (!formData.city.trim() || formData.state.trim().length !== 2) {
      Alert.alert("Validação", "Preencha cidade e UF válida.");
      return false;
    }
    if (!/^\d{5}-\d{3}$/.test(formData.zipCode)) {
      Alert.alert("Validação", "Informe um CEP válido no formato 00000-000.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!company) return;
    if (!canEditCompany) {
      Alert.alert(
        "Acesso",
        "Você não possui permissão para editar esta seção.",
      );
      return;
    }
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await updateCompany({
        phone: cleanFormat(formData.phone),
        email: formData.email.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zipCode: cleanFormat(formData.zipCode),
        address: {
          street: formData.street.trim(),
          number: formData.number.trim(),
          complement: formData.complement.trim() || undefined,
        },
      });

      Alert.alert("Sucesso", "Configurações da empresa atualizadas.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao atualizar dados.";
      Alert.alert("Erro", message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingCompany && !company) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>Perfil da empresa, ajuda e suporte</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Perfil da empresa</Text>
          <Text style={styles.cardHint}>
            Dados cadastrais principais e informações de contato.
          </Text>

          {!canEditCompany && (
            <View style={styles.readonlyBadge}>
              <Text style={styles.readonlyBadgeText}>
                Modo leitura para este usuário (dados sensíveis mascarados)
              </Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Razão social</Text>
            <TextInput
              value={formData.name}
              editable={false}
              style={[styles.input, styles.inputReadonly]}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>CNPJ</Text>
              <TextInput
                value={
                  isReadOnlyFuncionario
                    ? maskDocument(formData.cnpj)
                    : formData.cnpj
                }
                editable={false}
                style={[styles.input, styles.inputReadonly]}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                value={
                  isReadOnlyFuncionario
                    ? maskPhone(formData.phone)
                    : formData.phone
                }
                onChangeText={(value) => updateField("phone", value)}
                editable={canEditCompany && !isSaving}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-mail da empresa</Text>
            <TextInput
              value={
                isReadOnlyFuncionario
                  ? maskEmail(formData.email)
                  : formData.email
              }
              onChangeText={(value) => updateField("email", value)}
              editable={canEditCompany && !isSaving}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Proprietário</Text>
              <TextInput
                value={formData.ownerName}
                editable={false}
                style={[styles.input, styles.inputReadonly]}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>E-mail do proprietário</Text>
              <TextInput
                value={
                  isReadOnlyFuncionario
                    ? maskEmail(formData.ownerEmail)
                    : formData.ownerEmail
                }
                editable={false}
                style={[styles.input, styles.inputReadonly]}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Rua</Text>
            <TextInput
              value={
                isReadOnlyFuncionario
                  ? maskAddressLine(formData.street)
                  : formData.street
              }
              onChangeText={(value) => updateField("street", value)}
              editable={canEditCompany && !isSaving}
              style={styles.input}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 0.7, marginRight: 8 }]}>
              <Text style={styles.label}>Número</Text>
              <TextInput
                value={isReadOnlyFuncionario ? "—" : formData.number}
                onChangeText={(value) => updateField("number", value)}
                editable={canEditCompany && !isSaving}
                style={styles.input}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1.3 }]}>
              <Text style={styles.label}>Complemento</Text>
              <TextInput
                value={isReadOnlyFuncionario ? "—" : formData.complement}
                onChangeText={(value) => updateField("complement", value)}
                editable={canEditCompany && !isSaving}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1.4, marginRight: 8 }]}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                value={formData.city}
                onChangeText={(value) => updateField("city", value)}
                editable={canEditCompany && !isSaving}
                style={styles.input}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 0.6, marginRight: 8 }]}>
              <Text style={styles.label}>UF</Text>
              <TextInput
                value={formData.state}
                onChangeText={(value) => updateField("state", value)}
                editable={canEditCompany && !isSaving}
                style={styles.input}
                maxLength={2}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>CEP</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={isReadOnlyFuncionario ? "*****-***" : formData.zipCode}
                  onChangeText={(value) => updateField("zipCode", value)}
                  onBlur={() => handleFetchCEPData(formData.zipCode)}
                  editable={canEditCompany && !isSaving && !isFetchingCEP}
                  style={styles.input}
                  keyboardType="number-pad"
                />
                {isFetchingCEP && (
                  <View style={{ position: "absolute", right: 12, top: 12 }}>
                    <ActivityIndicator size="small" color="#2563EB" />
                  </View>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canEditCompany || isSaving) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!canEditCompany || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar alterações</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ajuda</Text>
          <Text style={styles.cardHint}>
            Tópicos rápidos para operação diária.
          </Text>

          <View style={styles.helpList}>
            {HELP_TOPICS.map((topic) => (
              <View key={topic} style={styles.helpItem}>
                <Text style={styles.helpItemText}>{topic}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              Alert.alert(
                "Guia rápido",
                "Fluxo recomendado: Cadastro de cliente e produto -> criação de OS -> geração de NF -> acompanhamento em Auditoria.",
              )
            }
          >
            <Text style={styles.secondaryButtonText}>Ver guia rápido</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suporte</Text>
          <Text style={styles.cardHint}>
            Canais para dúvidas operacionais e técnicas.
          </Text>

          <View style={styles.supportLine}>
            <Text style={styles.supportLabel}>E-mail</Text>
            <Text style={styles.supportValue}>suporte.opero@gmail.com</Text>
          </View>
          <View style={styles.supportLine}>
            <Text style={styles.supportLabel}>Horário</Text>
            <Text style={styles.supportValue}>Segunda a sexta, 08h às 18h</Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              Alert.alert(
                "Suporte",
                "Envie sua dúvida para suporte.opero@gmail.com com o nome da empresa e o contexto do problema.",
              )
            }
          >
            <Text style={styles.secondaryButtonText}>Como abrir chamado</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  readonlyBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  readonlyBadgeText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  fieldGroup: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
  },
  label: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  inputReadonly: {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  helpList: {
    gap: 8,
    marginBottom: 12,
  },
  helpItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  helpItemText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  supportLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
  },
  supportLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  supportValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
    marginLeft: 10,
    flexShrink: 1,
    textAlign: "right",
  },
});
