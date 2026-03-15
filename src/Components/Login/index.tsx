import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { styles } from './styles';
import { validateCredentials } from '../../utils/validation';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormErrors {
  email?: string;
  password?: string;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error: authError, clearError } = useAuth();

  const handleLogin = async () => {
    // Limpar erros anteriores
    clearError();
    setErrors({});

    // Validar credenciais
    const validation = validateCredentials(email, password);
    
    if (!validation.valid) {
      const errorMessage = validation.message;
      if (errorMessage?.includes('Email')) {
        setErrors({ email: errorMessage });
      } else if (errorMessage?.includes('Senha')) {
        setErrors({ password: errorMessage });
      }
      return;
    }

    try {
      await login(email, password);
      // Sucesso! A navegação será feita no App.tsx baseado em isAuthenticated
    } catch (err) {
      // Erro é tratado pelo contexto e exibido no authError
      Alert.alert('Erro', 'Email ou senha inválidos');
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) {
      setErrors({ ...errors, email: undefined });
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      setErrors({ ...errors, password: undefined });
    }
  };

  const isFormValid = email && password && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>O</Text>
          </View>
          <Text style={styles.title}>Opero</Text>
          <Text style={styles.subtitle}>
            Gestão inteligente de ordens de serviço para sua empresa
          </Text>
        </View>

        {/* Error Alert */}
        {authError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorMessage}>{authError}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputFocused,
                errors.email && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                maxLength={100}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View
              style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputFocused,
                errors.password && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                maxLength={50}
              />
              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={{ fontSize: 20 }}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Remember & Forgot Password */}
          <View style={styles.rememberContainer}>
            <TouchableOpacity
              style={styles.rememberCheck}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked,
                ]}
              >
                {rememberMe && <Text style={{ color: '#FFF', fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>Lembrar-me</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            !isFormValid && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={!isFormValid}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign Up */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Não tem uma conta?</Text>
          <TouchableOpacity disabled={isLoading}>
            <Text style={styles.signupLink}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
