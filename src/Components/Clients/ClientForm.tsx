/**
 * Formulário de Cliente
 * Para criar ou editar clientes da empresa
 */

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
} from "react-native";
import { Cliente } from "../../domains/clientes/types";
import { useClients } from "../../contexts/ClientsContext";

interface ClientFormProps {
  cliente?: Cliente;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClientForm({ cliente, onSuccess, onCancel }: ClientFormProps) {
  const { createCliente, updateCliente, verificarDocumento, isLoading } =
    useClients();
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "pf" as "pf" | "pj",
    documento: "",
    telefone: "",
    email: "",
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingDocument, setCheckingDocument] = useState(false);

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        tipo: cliente.tipo,
        documento: cliente.documento,
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        rua: cliente.endereco?.rua || "",
        numero: cliente.endereco?.numero || "",
        complemento: cliente.endereco?.complemento || "",
        cidade: cliente.endereco?.cidade || "",
        estado: cliente.endereco?.estado || "",
        cep: cliente.endereco?.cep || "",
        observacoes: cliente.observacoes || "",
      });
    }
  }, [cliente]);

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
              <View style={styles.tipoDocumentoContainer}>
                <TouchableOpacity
                  style={[
                    styles.tipoDocumentoButton,
                    formData.tipo === "pf" && styles.tipoDocumentoButtonActive,
                  ]}
                  onPress={() => updateField("tipo", "pf")}
                  disabled={isLoading || checkingDocument}
                >
                  <Text
                    style={[
                      styles.tipoDocumentoText,
                      formData.tipo === "pf" && styles.tipoDocumentoTextActive,
                    ]}
                  >
                    PF
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tipoDocumentoButton,
                    formData.tipo === "pj" && styles.tipoDocumentoButtonActive,
                  ]}
                  onPress={() => updateField("tipo", "pj")}
                  disabled={isLoading || checkingDocument}
                >
                  <Text
                    style={[
                      styles.tipoDocumentoText,
                      formData.tipo === "pj" && styles.tipoDocumentoTextActive,
                    ]}
                  >
                    PJ
                  </Text>
                </TouchableOpacity>
              </View>
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
                  onChangeText={(text) => updateField("documento", text)}
                  editable={!isLoading && !checkingDocument}
                  keyboardType="numeric"
                />
                {checkingDocument && (
                  <ActivityIndicator
                    size="small"
                    color="#2563EB"
                    style={styles.documentoCheckIcon}
                  />
                )}
              </View>
              {errors.documento && <ErrorText text={errors.documento} />}
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
                onChangeText={(text) => updateField("telefone", text)}
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

            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Estado *" />
              <TextInput
                style={[
                  styles.input,
                  errors.estado ? styles.inputError : undefined,
                ]}
                placeholder="SP"
                value={formData.estado}
                onChangeText={(text) =>
                  updateField("estado", text.toUpperCase())
                }
                editable={!isLoading && !checkingDocument}
                maxLength={2}
              />
              {errors.estado && <ErrorText text={errors.estado} />}
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
                onChangeText={(text) => updateField("cep", text)}
                editable={!isLoading && !checkingDocument}
                keyboardType="numeric"
              />
              {errors.cep && <ErrorText text={errors.cep} />}
            </View>
          </View>
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>

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
  textAreaInput: {
    paddingTop: 12,
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
