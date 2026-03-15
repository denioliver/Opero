import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCompany } from '../../contexts/CompanyContext';
import { Company } from '../../types';
import { useNavigation } from '@react-navigation/native';

export function CompanyRegister() {
  const navigation = useNavigation<any>();
  const { registerCompany, isLoadingCompany, companyError, clearCompanyError } = useCompany();

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome da empresa é obrigatório';
    if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'E-mail é obrigatório';
    if (!formData.street.trim()) newErrors.street = 'Rua é obrigatória';
    if (!formData.number.trim()) newErrors.number = 'Número é obrigatório';
    if (!formData.city.trim()) newErrors.city = 'Cidade é obrigatória';
    if (!formData.state.trim() || formData.state.length !== 2) {
      newErrors.state = 'Estado (UF) deve ter 2 caracteres';
    }
    if (!formData.zipCode.trim()) newErrors.zipCode = 'CEP é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validação', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      clearCompanyError();
      const companyData: Omit<Company, 'companyId' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        cnpj: formData.cnpj.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: {
          street: formData.street.trim(),
          number: formData.number.trim(),
          complement: formData.complement.trim() || undefined,
        },
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zipCode: formData.zipCode.trim(),
      };

      await registerCompany(companyData);
      Alert.alert('Sucesso', 'Empresa cadastrada com sucesso!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navegação automática via CompanyContext update
          } 
        },
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao cadastrar empresa';
      Alert.alert('Erro', errorMsg);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Limpar erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Cadastre Sua Empresa</Text>
          <Text style={styles.subtitle}>
            Preencha os dados para começar a usar o Opero
          </Text>
        </View>

        {companyError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{companyError}</Text>
          </View>
        )}

        {/* Dados Básicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados da Empresa</Text>

          <View style={styles.inputGroup}>
            <Label text="Nome da Empresa *" />
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ex: Seus Serviços LTDA"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              editable={!isLoadingCompany}
            />
            {errors.name && <ErrorText text={errors.name} />}
          </View>

          <View style={styles.inputGroup}>
            <Label text="CNPJ *" />
            <TextInput
              style={[styles.input, errors.cnpj && styles.inputError]}
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChangeText={(text) => updateField('cnpj', text)}
              editable={!isLoadingCompany}
              keyboardType="numeric"
            />
            {errors.cnpj && <ErrorText text={errors.cnpj} />}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Telefone *" />
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChangeText={(text) => updateField('phone', text)}
                editable={!isLoadingCompany}
                keyboardType="phone-pad"
              />
              {errors.phone && <ErrorText text={errors.phone} />}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Label text="E-mail *" />
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="empresa@email.com"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              editable={!isLoadingCompany}
              keyboardType="email-address"
            />
            {errors.email && <ErrorText text={errors.email} />}
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <View style={styles.inputGroup}>
            <Label text="Rua *" />
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              placeholder="Rua da Empresa"
              value={formData.street}
              onChangeText={(text) => updateField('street', text)}
              editable={!isLoadingCompany}
            />
            {errors.street && <ErrorText text={errors.street} />}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Número *" />
              <TextInput
                style={[styles.input, errors.number && styles.inputError]}
                placeholder="123"
                value={formData.number}
                onChangeText={(text) => updateField('number', text)}
                editable={!isLoadingCompany}
                keyboardType="numeric"
              />
              {errors.number && <ErrorText text={errors.number} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Complemento" />
              <TextInput
                style={styles.input}
                placeholder="Apt 101"
                value={formData.complement}
                onChangeText={(text) => updateField('complement', text)}
                editable={!isLoadingCompany}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
              <Label text="Cidade *" />
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                placeholder="São Paulo"
                value={formData.city}
                onChangeText={(text) => updateField('city', text)}
                editable={!isLoadingCompany}
              />
              {errors.city && <ErrorText text={errors.city} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="UF *" />
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                placeholder="SP"
                value={formData.state}
                onChangeText={(text) => updateField('state', text.toUpperCase())}
                editable={!isLoadingCompany}
                maxLength={2}
              />
              {errors.state && <ErrorText text={errors.state} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="CEP *" />
              <TextInput
                style={[styles.input, errors.zipCode && styles.inputError]}
                placeholder="00000-000"
                value={formData.zipCode}
                onChangeText={(text) => updateField('zipCode', text)}
                editable={!isLoadingCompany}
                keyboardType="numeric"
              />
              {errors.zipCode && <ErrorText text={errors.zipCode} />}
            </View>
          </View>
        </View>

        {/* Botão Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isLoadingCompany && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoadingCompany}
        >
          {isLoadingCompany ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Criar Empresa</Text>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Componentes Helper
function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ErrorText({ text }: { text: string }) {
  return <Text style={styles.errorField}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorField: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});
