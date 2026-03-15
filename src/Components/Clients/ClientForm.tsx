import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useClients } from '../../contexts/ClientsContext';
import { Client } from '../../types';

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const { addClient, updateClient, isLoadingClients } = useClients();
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
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

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        cpfCnpj: client.cpfCnpj,
        phone: client.phone,
        email: client.email || '',
        street: client.address.street,
        number: client.address.number,
        complement: client.address.complement || '',
        city: client.city,
        state: client.state,
        zipCode: client.zipCode,
      });
    }
  }, [client]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.cpfCnpj.trim()) newErrors.cpfCnpj = 'CPF/CNPJ é obrigatório';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.street.trim()) newErrors.street = 'Rua é obrigatória';
    if (!formData.number.trim()) newErrors.number = 'Número é obrigatório';
    if (!formData.city.trim()) newErrors.city = 'Cidade é obrigatória';
    if (!formData.state.trim() || formData.state.length !== 2) {
      newErrors.state = 'UF com 2 caracteres';
    }
    if (!formData.zipCode.trim()) newErrors.zipCode = 'CEP é obrigatório';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validação', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const clientData = {
        name: formData.name.trim(),
        cpfCnpj: formData.cpfCnpj.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: {
          street: formData.street.trim(),
          number: formData.number.trim(),
          complement: formData.complement.trim() || undefined,
        },
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zipCode: formData.zipCode.trim(),
        active: true,
      };

      if (client) {
        await updateClient(client.clientId, clientData);
        Alert.alert('Sucesso', 'Cliente atualizado com sucesso!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      } else {
        await addClient(clientData);
        Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar cliente';
      Alert.alert('Erro', msg);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{client ? 'Editar Cliente' : 'Novo Cliente'}</Text>
        </View>

        {/* Dados Básicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Cliente</Text>

          <View style={styles.inputGroup}>
            <Label text="Nome *" />
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Nome completo"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              editable={!isLoadingClients}
            />
            {errors.name && <ErrorText text={errors.name} />}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="CPF/CNPJ *" />
              <TextInput
                style={[styles.input, errors.cpfCnpj && styles.inputError]}
                placeholder="000.000.000-00"
                value={formData.cpfCnpj}
                onChangeText={(text) => updateField('cpfCnpj', text)}
                editable={!isLoadingClients}
                keyboardType="numeric"
              />
              {errors.cpfCnpj && <ErrorText text={errors.cpfCnpj} />}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Telefone *" />
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChangeText={(text) => updateField('phone', text)}
                editable={!isLoadingClients}
                keyboardType="phone-pad"
              />
              {errors.phone && <ErrorText text={errors.phone} />}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Label text="E-mail" />
            <TextInput
              style={styles.input}
              placeholder="cliente@email.com"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              editable={!isLoadingClients}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <View style={styles.inputGroup}>
            <Label text="Rua *" />
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              placeholder="Rua do cliente"
              value={formData.street}
              onChangeText={(text) => updateField('street', text)}
              editable={!isLoadingClients}
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
                editable={!isLoadingClients}
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
                editable={!isLoadingClients}
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
                editable={!isLoadingClients}
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
                editable={!isLoadingClients}
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
                editable={!isLoadingClients}
                keyboardType="numeric"
              />
              {errors.zipCode && <ErrorText text={errors.zipCode} />}
            </View>
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isLoadingClients}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isLoadingClients && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoadingClients}
          >
            {isLoadingClients ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {client ? 'Atualizar' : 'Criar'}
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
    backgroundColor: '#F8FAFB',
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
    fontWeight: '700',
    color: '#1F2937',
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
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563EB',
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
