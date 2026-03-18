import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";

export const Login: React.FC = () => {
  const [emailOrName, setEmailOrName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false); // Flag para controlar re-renders

  const {
    login,
    isLoading: authLoading,
    error: authError,
    clearError,
  } = useAuth();
  const {
    loginFuncionario,
    isLoading: funcionarioLoading,
    error: funcionarioError,
    clearError: clearFuncionarioError,
  } = useFuncionario();

  const isLoading = authLoading || funcionarioLoading;

  // Limpar erro quando usuário começa a digitar novamente
  useEffect(() => {
    if (hasError && (emailOrName || password)) {
      setHasError(false);
      clearError();
      clearFuncionarioError();
    }
  }, [emailOrName, password]);

  const detectLoginType = (input: string): "email" | "name" => {
    return input.includes("@") ? "email" : "name";
  };

  const handleLogin = async () => {
    // Se há erro, limpar antes de tentar novamente
    if (hasError) {
      setHasError(false);
      clearError();
      clearFuncionarioError();
    }

    if (!emailOrName.trim() || !password.trim()) {
      Alert.alert("Erro", "Preencha email/nome e senha");
      return;
    }

    const type = detectLoginType(emailOrName);

    if (type === "email") {
      // Login como Admin ou Proprietário (Firebase)
      // AuthContext vai lidar com isso (necessarioCriarPerfil)
      // Erros são exibidos via setError() na mensagem vermelha
      await login(emailOrName, password);
      // Se houver erro, authError será setado pelo AuthContext
      // Se sucesso, onAuthStateChanged dispara e navega
    } else {
      // Login como Funcionário
      await loginFuncionario(emailOrName.trim(), password);
    }
  };

  const isFormValid =
    emailOrName.length > 0 && password.length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>O</Text>
            </View>
            <Text style={styles.title}>Opero</Text>
            <Text style={styles.subtitle}>Gestão de Empresas</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📧 Email:</Text>
            <Text style={styles.infoText}>Admin ou Proprietário</Text>
            <Text style={styles.infoTitle} style={{ marginTop: 8 }}>
              👤 Nome:
            </Text>
            <Text style={styles.infoText}>Funcionário da empresa</Text>
          </View>

          {/* Errors */}
          {(authError || funcionarioError) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {authError || funcionarioError}
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email ou Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com ou João Silva"
              value={emailOrName}
              onChangeText={setEmailOrName}
              autoCapitalize="none"
              editable={!isLoading}
              placeholderTextColor="#999"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordBox}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text>{showPassword ? "👁️" : "🔒"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.button,
              !isFormValid ? styles.buttonDisabled : undefined,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2563EB",
  },
  infoText: {
    fontSize: 13,
    color: "#1F2937",
    marginBottom: 4,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFF",
  },
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  eyeBtn: {
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
