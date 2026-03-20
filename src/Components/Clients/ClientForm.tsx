/**
 * Formulário de Cliente
 * Para criar ou editar clientes da empresa
 */

import React, { useState, useEffect, useRef } from "react";
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
  useWindowDimensions,
} from "react-native";
import { Cliente } from "../../domains/clientes/types";
import { useClients } from "../../contexts/ClientsContext";
import {
  formatCNPJ,
  formatCPF,
  formatPhone,
  formatZipCode,
  formatCurrencyInput,
  parseCurrencyInput,
  cleanFormat,
} from "../../utils/formatters";
import {
  fetchAddressByCEP,
  fetchCNPJData,
  fetchCPFData,
  validateCNPJFormat,
  validateCPFFormat,
} from "../../utils/brazilData";

interface ClientFormProps {
  cliente?: Cliente;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const OBSERVATION_TEMPLATES = [
  "Contato preferencial por WhatsApp",
  "Cliente recorrente",
  "Necessita orçamento prévio",
  "Atendimento comercial prioritário",
];

const SEXO_OPTIONS = [
  { label: "Masculino", value: "masculino" },
  { label: "Feminino", value: "feminino" },
  { label: "Outro", value: "outro" },
  { label: "Não informar", value: "nao_informado" },
] as const;

const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const PHONE_REGEX = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
const CEP_REGEX = /^\d{5}-\d{3}$/;
const RG_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dXx]$/;

function formatRG(value: string): string {
  const raw = value
    .toUpperCase()
    .replace(/[^\dX]/g, "")
    .slice(0, 9);
  const dv = raw.slice(-1);
  const body = raw.slice(0, -1);

  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
  if (raw.length <= 8)
    return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;

  return `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5, 8)}-${dv}`;
}

export function ClientForm({ cliente, onSuccess, onCancel }: ClientFormProps) {
  const { height: screenHeight } = useWindowDimensions();
  const dropdownMaxHeight = Math.max(
    180,
    Math.min(360, Math.floor(screenHeight * 0.4)),
  );

  const { createCliente, updateCliente, verificarDocumento, isLoading } =
    useClients();
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "pf" as "pf" | "pj",
    documento: "",
    rg: "",
    sexo: "nao_informado" as
      | "masculino"
      | "feminino"
      | "outro"
      | "nao_informado",
    telefone: "",
    email: "",
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    cep: "",
    razaoSocial: "",
    nomeFantasia: "",
    limiteCredito: "0,00",
    descontoPercentual: "0",
    status: "ativo" as "ativo" | "bloqueado",
    observacoes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingDocument, setCheckingDocument] = useState(false);
  const [isFetchingDocumentData, setIsFetchingDocumentData] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const lastAutoDocumentRef = useRef("");
  const lastAutoCepRef = useRef("");
  const [showTipoOptions, setShowTipoOptions] = useState(false);
  const [showSexoOptions, setShowSexoOptions] = useState(false);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [showUfOptions, setShowUfOptions] = useState(false);
  const [showObservationOptions, setShowObservationOptions] = useState(false);

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        tipo: cliente.tipo,
        documento: cliente.documento,
        rg: cliente.rg || "",
        sexo: cliente.sexo || "nao_informado",
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        rua: cliente.endereco?.rua || "",
        numero: cliente.endereco?.numero || "",
        complemento: cliente.endereco?.complemento || "",
        cidade: cliente.endereco?.cidade || "",
        estado: cliente.endereco?.estado || "",
        cep: cliente.endereco?.cep || "",
        razaoSocial: cliente.razaoSocial || "",
        nomeFantasia: cliente.nomeFantasia || "",
        limiteCredito: formatCurrencyInput(
          String(Math.round((cliente.limiteCredito ?? 0) * 100)),
        ),
        descontoPercentual: String(cliente.descontoPercentual ?? 0),
        status: cliente.status === "bloqueado" ? "bloqueado" : "ativo",
        observacoes: cliente.observacoes || "",
      });
    }
  }, [cliente]);

  useEffect(() => {
    if (cliente) return;

    const cleanDocument = cleanFormat(formData.documento);
    const docKey = `${formData.tipo}:${cleanDocument}`;

    if (
      (formData.tipo === "pf" && cleanDocument.length !== 11) ||
      (formData.tipo === "pj" && cleanDocument.length !== 14)
    ) {
      return;
    }

    if (lastAutoDocumentRef.current === docKey) {
      return;
    }

    lastAutoDocumentRef.current = docKey;

    const autoLoadDocumentData = async () => {
      setIsFetchingDocumentData(true);
      try {
        if (formData.tipo === "pf" && validateCPFFormat(cleanDocument)) {
          const data = await fetchCPFData(cleanDocument);
          if (data.name) {
            setFormData((prev) => ({
              ...prev,
              documento: formatCPF(cleanDocument),
              nome: prev.nome.trim() ? prev.nome : data.name,
            }));
          }
        }

        if (formData.tipo === "pj" && validateCNPJFormat(cleanDocument)) {
          const data = await fetchCNPJData(cleanDocument);
          setFormData((prev) => ({
            ...prev,
            documento: formatCNPJ(cleanDocument),
            nome: prev.nome.trim() ? prev.nome : data.name || prev.nome,
            razaoSocial: prev.razaoSocial.trim()
              ? prev.razaoSocial
              : data.name || prev.razaoSocial,
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
      } catch (error) {
        console.warn(
          "[ClientForm] Falha no carregamento automático por documento:",
          error,
        );
      } finally {
        setIsFetchingDocumentData(false);
      }
    };

    autoLoadDocumentData();
  }, [formData.documento, formData.tipo, cliente]);

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
          "[ClientForm] Falha no carregamento automático por CEP:",
          error,
        );
      } finally {
        setIsFetchingCep(false);
      }
    };

    autoLoadCepData();
  }, [formData.cep]);

  const validateDocument = async (documento: string): Promise<boolean> => {
    // Não validar se está editando e mantendo o mesmo documento
    if (cliente && cliente.documento === documento) {
      return true;
    }

    setCheckingDocument(true);
    try {
      const exists = await verificarDocumento(
        documento,
        cliente?.id, // Exclui o cliente atual se estiver editando
      );
      setCheckingDocument(false);
      return !exists;
    } catch (error) {
      setCheckingDocument(false);
      return false;
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!formData.documento.trim())
      newErrors.documento = "Documento é obrigatório";
    if (!formData.telefone.trim())
      newErrors.telefone = "Telefone é obrigatório";
    if (!formData.rua.trim()) newErrors.rua = "Rua é obrigatória";
    if (!formData.numero.trim()) newErrors.numero = "Número é obrigatório";
    if (!formData.cidade.trim()) newErrors.cidade = "Cidade é obrigatória";
    if (!formData.estado.trim() || formData.estado.length !== 2) {
      newErrors.estado = "Estado com 2 caracteres";
    }
    if (!formData.cep.trim()) newErrors.cep = "CEP é obrigatório";

    if (formData.tipo === "pf" && !CPF_REGEX.test(formData.documento)) {
      newErrors.documento = "CPF inválido. Use o formato 000.000.000-00";
    }

    if (
      formData.tipo === "pf" &&
      CPF_REGEX.test(formData.documento) &&
      !validateCPFFormat(formData.documento)
    ) {
      newErrors.documento = "CPF inválido";
    }

    if (formData.tipo === "pj" && !CNPJ_REGEX.test(formData.documento)) {
      newErrors.documento = "CNPJ inválido. Use o formato 00.000.000/0000-00";
    }

    if (
      formData.tipo === "pj" &&
      CNPJ_REGEX.test(formData.documento) &&
      !validateCNPJFormat(formData.documento)
    ) {
      newErrors.documento = "CNPJ inválido";
    }

    if (!PHONE_REGEX.test(formData.telefone)) {
      newErrors.telefone = "Telefone inválido. Use (11) 99999-9999";
    }

    if (!CEP_REGEX.test(formData.cep)) {
      newErrors.cep = "CEP inválido. Use 00000-000";
    }

    if (formData.rg.trim() && !RG_REGEX.test(formData.rg)) {
      newErrors.rg = "RG inválido. Use 00.000.000-0";
    }

    if (formData.tipo === "pj" && !formData.razaoSocial.trim()) {
      newErrors.razaoSocial = "Razão social é obrigatória para PJ";
    }

    const limiteCredito = parseCurrencyInput(formData.limiteCredito);
    if (Number.isNaN(limiteCredito) || limiteCredito < 0) {
      newErrors.limiteCredito = "Limite de crédito inválido";
    }

    const descontoPercentual = Number(
      formData.descontoPercentual.replace(",", "."),
    );
    if (
      Number.isNaN(descontoPercentual) ||
      descontoPercentual < 0 ||
      descontoPercentual > 100
    ) {
      newErrors.descontoPercentual = "Desconto deve estar entre 0 e 100";
    }

    // Validar unicidade do documento
    if (!newErrors.documento) {
      const isValid = await validateDocument(formData.documento);
      if (!isValid) {
        newErrors.documento = "Este documento já está cadastrado";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      Alert.alert("Validação", "Corrija os erros antes de continuar");
      return;
    }

    try {
      const clienteData = {
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        documento: formData.documento.trim(),
        rg: formData.rg.trim() || undefined,
        sexo: formData.sexo,
        telefone: formData.telefone.trim(),
        email: formData.email.trim() || undefined,
        razaoSocial:
          formData.tipo === "pj"
            ? formData.razaoSocial.trim() || undefined
            : undefined,
        nomeFantasia:
          formData.tipo === "pj"
            ? formData.nomeFantasia.trim() || undefined
            : undefined,
        limiteCredito: parseCurrencyInput(formData.limiteCredito) || 0,
        descontoPercentual:
          Number(formData.descontoPercentual.replace(",", ".")) || 0,
        endereco: {
          rua: formData.rua.trim(),
          numero: formData.numero.trim(),
          complemento: formData.complemento.trim() || undefined,
          cidade: formData.cidade.trim(),
          estado: formData.estado.trim().toUpperCase(),
          cep: formData.cep.trim(),
        },
        status: formData.status,
        observacoes: formData.observacoes.trim() || undefined,
      };

      if (cliente) {
        await updateCliente(cliente.id, clienteData);
        Alert.alert("Sucesso", "Cliente atualizado com sucesso!", [
          { text: "OK", onPress: onSuccess },
        ]);
      } else {
        await createCliente(clienteData);
        Alert.alert("Sucesso", "Cliente cadastrado com sucesso!", [
          { text: "OK", onPress: onSuccess },
        ]);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao salvar cliente";
      Alert.alert("Erro", msg);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDocumentoChange = (text: string) => {
    const formatted =
      formData.tipo === "pf" ? formatCPF(text) : formatCNPJ(text);
    updateField("documento", formatted);
  };

  const handleTipoChange = (tipo: "pf" | "pj") => {
    const documentoSomenteDigitos = formData.documento.replace(/\D/g, "");
    const documentoFormatado =
      tipo === "pf"
        ? formatCPF(documentoSomenteDigitos.slice(0, 11))
        : formatCNPJ(documentoSomenteDigitos.slice(0, 14));

    setFormData((prev) => ({
      ...prev,
      tipo,
      documento: documentoFormatado,
    }));

    if (errors.tipo || errors.documento) {
      setErrors((prev) => ({
        ...prev,
        tipo: "",
        documento: "",
      }));
    }
  };

  const handleTelefoneChange = (text: string) => {
    updateField("telefone", formatPhone(text));
  };

  const handleCepChange = (text: string) => {
    updateField("cep", formatZipCode(text));
  };

  const handleLimiteCreditoChange = (text: string) => {
    updateField("limiteCredito", formatCurrencyInput(text));
  };

  const handleRgChange = (text: string) => {
    updateField("rg", formatRG(text));
  };

  const toggleObservationTemplate = (template: string) => {
    const normalizedTemplate = template.trim();
    const current = formData.observacoes.trim();
    const hasTemplate = current.includes(normalizedTemplate);

    if (hasTemplate) {
      const updated = current
        .replace(normalizedTemplate, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\n\n+/g, "\n")
        .trim();
      updateField("observacoes", updated);
      return;
    }

    const separator = current.length > 0 ? "\n" : "";
    updateField("observacoes", `${current}${separator}${normalizedTemplate}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {cliente ? "Editar Cliente" : "Novo Cliente"}
          </Text>
        </View>

        {/* Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>

          <View style={styles.inputGroup}>
            <Label text="Nome Completo *" />
            <TextInput
              style={[
                styles.input,
                errors.nome ? styles.inputError : undefined,
              ]}
              placeholder="Ex: João Silva"
              value={formData.nome}
              onChangeText={(text) => updateField("nome", text)}
              editable={!isLoading && !checkingDocument}
            />
            {errors.nome && <ErrorText text={errors.nome} />}
          </View>

          {/* Tipo de Documento e Documento */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Tipo de Documento *" />
              <TouchableOpacity
                style={styles.selectTrigger}
                onPress={() => setShowTipoOptions((prev) => !prev)}
                disabled={isLoading || checkingDocument}
              >
                <Text style={styles.selectTriggerText}>
                  {formData.tipo === "pf"
                    ? "Pessoa Física (PF)"
                    : "Pessoa Jurídica (PJ)"}
                </Text>
                <Text style={styles.selectTriggerIcon}>
                  {showTipoOptions ? "▴" : "▾"}
                </Text>
              </TouchableOpacity>

              {showTipoOptions && (
                <ScrollView
                  style={[
                    styles.selectOptionsPanel,
                    { maxHeight: dropdownMaxHeight },
                  ]}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  persistentScrollbar
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={[
                      styles.selectOption,
                      formData.tipo === "pf" && styles.selectOptionActive,
                    ]}
                    onPress={() => {
                      handleTipoChange("pf");
                      setShowTipoOptions(false);
                    }}
                    disabled={isLoading || checkingDocument}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        formData.tipo === "pf" && styles.selectOptionTextActive,
                      ]}
                    >
                      Pessoa Física (PF)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.selectOption,
                      formData.tipo === "pj" && styles.selectOptionActive,
                    ]}
                    onPress={() => {
                      handleTipoChange("pj");
                      setShowTipoOptions(false);
                    }}
                    disabled={isLoading || checkingDocument}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        formData.tipo === "pj" && styles.selectOptionTextActive,
                      ]}
                    >
                      Pessoa Jurídica (PJ)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1.5 }]}>
              <Label text="CPF/CNPJ *" />
              <View style={styles.documentoInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.documentoInput,
                    errors.documento ? styles.inputError : undefined,
                  ]}
                  placeholder={
                    formData.tipo === "pf"
                      ? "000.000.000-00"
                      : "00.000.000/0000-00"
                  }
                  value={formData.documento}
                  onChangeText={handleDocumentoChange}
                  editable={!isLoading && !checkingDocument}
                  keyboardType="numeric"
                />
                {(checkingDocument || isFetchingDocumentData) && (
                  <ActivityIndicator
                    size="small"
                    color="#2563EB"
                    style={styles.documentoCheckIcon}
                  />
                )}
              </View>
              {isFetchingDocumentData && (
                <Text style={styles.inputHint}>
                  Carregando dados automáticos...
                </Text>
              )}
              {errors.documento && <ErrorText text={errors.documento} />}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="RG (opcional)" />
              <TextInput
                style={[
                  styles.input,
                  errors.rg ? styles.inputError : undefined,
                ]}
                placeholder="00.000.000-0"
                value={formData.rg}
                onChangeText={handleRgChange}
                editable={!isLoading && !checkingDocument}
              />
              {errors.rg && <ErrorText text={errors.rg} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Sexo" />
              <TouchableOpacity
                style={styles.selectTrigger}
                onPress={() => setShowSexoOptions((prev) => !prev)}
                disabled={isLoading || checkingDocument}
              >
                <Text style={styles.selectTriggerText}>
                  {SEXO_OPTIONS.find((item) => item.value === formData.sexo)
                    ?.label || "Selecione"}
                </Text>
                <Text style={styles.selectTriggerIcon}>
                  {showSexoOptions ? "▴" : "▾"}
                </Text>
              </TouchableOpacity>

              {showSexoOptions && (
                <ScrollView
                  style={[
                    styles.selectOptionsPanel,
                    { maxHeight: dropdownMaxHeight },
                  ]}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  persistentScrollbar
                  keyboardShouldPersistTaps="handled"
                >
                  {SEXO_OPTIONS.map((option) => {
                    const selected = formData.sexo === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.selectOption,
                          selected && styles.selectOptionActive,
                        ]}
                        onPress={() => {
                          updateField("sexo", option.value);
                          setShowSexoOptions(false);
                        }}
                        disabled={isLoading || checkingDocument}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            selected && styles.selectOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Telefone *" />
              <TextInput
                style={[
                  styles.input,
                  errors.telefone ? styles.inputError : undefined,
                ]}
                placeholder="(11) 99999-9999"
                value={formData.telefone}
                onChangeText={handleTelefoneChange}
                editable={!isLoading && !checkingDocument}
                keyboardType="phone-pad"
              />
              {errors.telefone && <ErrorText text={errors.telefone} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="E-mail" />
              <TextInput
                style={styles.input}
                placeholder="cliente@email.com"
                value={formData.email}
                onChangeText={(text) => updateField("email", text)}
                editable={!isLoading && !checkingDocument}
                keyboardType="email-address"
              />
            </View>
          </View>
        </View>

        {formData.tipo === "pj" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados Jurídicos</Text>

            <View style={styles.inputGroup}>
              <Label text="Razão Social *" />
              <TextInput
                style={[
                  styles.input,
                  errors.razaoSocial ? styles.inputError : undefined,
                ]}
                placeholder="Razão social da empresa"
                value={formData.razaoSocial}
                onChangeText={(text) => updateField("razaoSocial", text)}
                editable={!isLoading && !checkingDocument}
              />
              {errors.razaoSocial && <ErrorText text={errors.razaoSocial} />}
            </View>

            <View style={styles.inputGroup}>
              <Label text="Nome Fantasia" />
              <TextInput
                style={styles.input}
                placeholder="Nome fantasia"
                value={formData.nomeFantasia}
                onChangeText={(text) => updateField("nomeFantasia", text)}
                editable={!isLoading && !checkingDocument}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Política Comercial</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Limite de Crédito" />
              <TextInput
                style={[
                  styles.input,
                  errors.limiteCredito ? styles.inputError : undefined,
                ]}
                placeholder="0,00"
                value={formData.limiteCredito}
                onChangeText={handleLimiteCreditoChange}
                editable={!isLoading && !checkingDocument}
                keyboardType="decimal-pad"
              />
              {errors.limiteCredito && (
                <ErrorText text={errors.limiteCredito} />
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Desconto %" />
              <TextInput
                style={[
                  styles.input,
                  errors.descontoPercentual ? styles.inputError : undefined,
                ]}
                placeholder="0"
                value={formData.descontoPercentual}
                onChangeText={(text) => updateField("descontoPercentual", text)}
                editable={!isLoading && !checkingDocument}
                keyboardType="decimal-pad"
              />
              {errors.descontoPercentual && (
                <ErrorText text={errors.descontoPercentual} />
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Label text="Status Comercial" />
            <TouchableOpacity
              style={styles.selectTrigger}
              onPress={() => setShowStatusOptions((prev) => !prev)}
              disabled={!cliente || isLoading || checkingDocument}
            >
              <Text style={styles.selectTriggerText}>
                {formData.status === "bloqueado" ? "Bloqueado" : "Ativo"}
              </Text>
              <Text style={styles.selectTriggerIcon}>
                {showStatusOptions ? "▴" : "▾"}
              </Text>
            </TouchableOpacity>

            {showStatusOptions && (
              <ScrollView
                style={[
                  styles.selectOptionsPanel,
                  { maxHeight: dropdownMaxHeight },
                ]}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                persistentScrollbar
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity
                  style={[
                    styles.selectOption,
                    formData.status === "ativo" && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    updateField("status", "ativo");
                    setShowStatusOptions(false);
                  }}
                  disabled={isLoading || checkingDocument}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      formData.status === "ativo" &&
                        styles.selectOptionTextActive,
                    ]}
                  >
                    Ativo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.selectOption,
                    formData.status === "bloqueado" &&
                      styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    updateField("status", "bloqueado");
                    setShowStatusOptions(false);
                  }}
                  disabled={isLoading || checkingDocument}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      formData.status === "bloqueado" &&
                        styles.selectOptionTextActive,
                    ]}
                  >
                    Bloqueado
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {!cliente && (
              <Text style={styles.errorField}>
                O bloqueio pode ser alterado após o cliente ser criado.
              </Text>
            )}
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <View style={styles.inputGroup}>
            <Label text="Rua *" />
            <TextInput
              style={[styles.input, errors.rua ? styles.inputError : undefined]}
              placeholder="Ex: Rua da Paz"
              value={formData.rua}
              onChangeText={(text) => updateField("rua", text)}
              editable={!isLoading && !checkingDocument}
            />
            {errors.rua && <ErrorText text={errors.rua} />}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Número *" />
              <TextInput
                style={[
                  styles.input,
                  errors.numero ? styles.inputError : undefined,
                ]}
                placeholder="123"
                value={formData.numero}
                onChangeText={(text) => updateField("numero", text)}
                editable={!isLoading && !checkingDocument}
                keyboardType="numeric"
              />
              {errors.numero && <ErrorText text={errors.numero} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Complemento" />
              <TextInput
                style={styles.input}
                placeholder="Apt 101"
                value={formData.complemento}
                onChangeText={(text) => updateField("complemento", text)}
                editable={!isLoading && !checkingDocument}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
              <Label text="Cidade *" />
              <TextInput
                style={[
                  styles.input,
                  errors.cidade ? styles.inputError : undefined,
                ]}
                placeholder="São Paulo"
                value={formData.cidade}
                onChangeText={(text) => updateField("cidade", text)}
                editable={!isLoading && !checkingDocument}
              />
              {errors.cidade && <ErrorText text={errors.cidade} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="CEP *" />
              <TextInput
                style={[
                  styles.input,
                  errors.cep ? styles.inputError : undefined,
                ]}
                placeholder="00000-000"
                value={formData.cep}
                onChangeText={handleCepChange}
                editable={!isLoading && !checkingDocument}
                keyboardType="numeric"
              />
              {isFetchingCep && (
                <Text style={styles.inputHint}>Carregando endereço...</Text>
              )}
              {errors.cep && <ErrorText text={errors.cep} />}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Label text="Estado *" />
            <TouchableOpacity
              style={[
                styles.selectTrigger,
                errors.estado ? styles.inputError : undefined,
              ]}
              onPress={() => setShowUfOptions((prev) => !prev)}
              disabled={isLoading || checkingDocument}
            >
              <Text style={styles.selectTriggerText}>
                {formData.estado || "Selecione o estado"}
              </Text>
              <Text style={styles.selectTriggerIcon}>
                {showUfOptions ? "▴" : "▾"}
              </Text>
            </TouchableOpacity>

            {showUfOptions && (
              <ScrollView
                style={[
                  styles.selectOptionsPanel,
                  { maxHeight: dropdownMaxHeight },
                ]}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                persistentScrollbar
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.ufSelector}>
                  {UFS.map((uf) => {
                    const selected = formData.estado === uf;
                    return (
                      <TouchableOpacity
                        key={uf}
                        style={[styles.ufChip, selected && styles.ufChipActive]}
                        onPress={() => {
                          updateField("estado", uf);
                          setShowUfOptions(false);
                        }}
                        disabled={isLoading || checkingDocument}
                      >
                        <Text
                          style={[
                            styles.ufChipText,
                            selected && styles.ufChipTextActive,
                          ]}
                        >
                          {uf}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
            {errors.estado && <ErrorText text={errors.estado} />}
          </View>
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>

          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setShowObservationOptions((prev) => !prev)}
            disabled={isLoading || checkingDocument}
          >
            <Text style={styles.selectTriggerText}>Modelos de observação</Text>
            <Text style={styles.selectTriggerIcon}>
              {showObservationOptions ? "▴" : "▾"}
            </Text>
          </TouchableOpacity>

          {showObservationOptions && (
            <ScrollView
              style={[
                styles.selectOptionsPanel,
                { maxHeight: dropdownMaxHeight },
              ]}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              persistentScrollbar
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.quickNotesContainer}>
                {OBSERVATION_TEMPLATES.map((template) => {
                  const selected = formData.observacoes.includes(template);
                  return (
                    <TouchableOpacity
                      key={template}
                      style={[
                        styles.quickNoteChip,
                        selected && styles.quickNoteChipActive,
                      ]}
                      onPress={() => toggleObservationTemplate(template)}
                      disabled={isLoading || checkingDocument}
                    >
                      <Text
                        style={[
                          styles.quickNoteText,
                          selected && styles.quickNoteTextActive,
                        ]}
                      >
                        {template}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={styles.inputGroup}>
            <Label text="Notas sobre o cliente" />
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder="Informações adicionais..."
              value={formData.observacoes}
              onChangeText={(text) => updateField("observacoes", text)}
              editable={!isLoading && !checkingDocument}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isLoading || checkingDocument}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              (isLoading || checkingDocument) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || checkingDocument}
          >
            {isLoading || checkingDocument ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {cliente ? "Atualizar" : "Criar"}
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 16,
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorField: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  tipoDocumentoContainer: {
    flexDirection: "row",
    gap: 8,
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
    flexShrink: 1,
    marginRight: 8,
  },
  selectTriggerIcon: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  selectOptionsPanel: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    zIndex: 50,
    elevation: 50,
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
  tipoDocumentoButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  tipoDocumentoButtonActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  tipoDocumentoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tipoDocumentoTextActive: {
    color: "#2563EB",
  },
  documentoInputContainer: {
    position: "relative",
  },
  documentoInput: {
    paddingRight: 40,
  },
  documentoCheckIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  inputHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  textAreaInput: {
    paddingTop: 12,
  },
  ufSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ufChip: {
    width: 34,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
    paddingVertical: 7,
    alignItems: "center",
  },
  ufChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  ufChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  ufChipTextActive: {
    color: "#2563EB",
  },
  quickNotesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  quickNoteChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickNoteChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  quickNoteText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
  },
  quickNoteTextActive: {
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
