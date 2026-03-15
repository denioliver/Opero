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
  Picker,
} from 'react-native';
import { useProducts } from '../../contexts/ProductsContext';
import { Product, ProductCategory } from '../../types';

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { addProduct, updateProduct, isLoadingProducts } = useProducts();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Produto' as ProductCategory,
    unitPrice: '',
    unit: 'unidade',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        unitPrice: product.unitPrice.toString(),
        unit: product.unit,
      });
    }
  }, [product]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.unitPrice.trim()) newErrors.unitPrice = 'Preço é obrigatório';
    if (isNaN(parseFloat(formData.unitPrice))) newErrors.unitPrice = 'Preço deve ser um número';
    if (parseFloat(formData.unitPrice) <= 0) newErrors.unitPrice = 'Preço deve ser maior que 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validação', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unitPrice: parseFloat(formData.unitPrice),
        unit: formData.unit,
        active: true,
      };

      if (product) {
        await updateProduct(product.productId, productData);
        Alert.alert('Sucesso', 'Produto atualizado com sucesso!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      } else {
        await addProduct(productData);
        Alert.alert('Sucesso', 'Produto cadastrado com sucesso!', [
          { text: 'OK', onPress: onSuccess },
        ]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar produto';
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
          <Text style={styles.title}>{product ? 'Editar Produto' : 'Novo Produto'}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Label text="Nome do Produto/Serviço *" />
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ex: Manutenção de HVAC"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
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
              onChangeText={(text) => updateField('description', text)}
              editable={!isLoadingProducts}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Label text="Tipo *" />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => updateField('category', value)}
                  enabled={!isLoadingProducts}
                >
                  <Picker.Item label="Produto" value="Produto" />
                  <Picker.Item label="Serviço" value="Serviço" />
                </Picker>
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Label text="Unidade" />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.unit}
                  onValueChange={(value) => updateField('unit', value)}
                  enabled={!isLoadingProducts}
                >
                  <Picker.Item label="Unidade" value="unidade" />
                  <Picker.Item label="Hora" value="hora" />
                  <Picker.Item label="Metro" value="metro" />
                  <Picker.Item label="Kg" value="kg" />
                  <Picker.Item label="Litro" value="litro" />
                  <Picker.Item label="Caixa" value="caixa" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Label text="Preço Unitário *" />
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>R$</Text>
              <TextInput
                style={[styles.priceInput, errors.unitPrice && styles.inputError]}
                placeholder="0,00"
                value={formData.unitPrice}
                onChangeText={(text) => updateField('unitPrice', text)}
                editable={!isLoadingProducts}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.unitPrice && <ErrorText text={errors.unitPrice} />}
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isLoadingProducts}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isLoadingProducts && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoadingProducts}
          >
            {isLoadingProducts ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {product ? 'Atualizar' : 'Criar'}
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
  textArea: {
    height: 100,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
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
