import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../contexts/AuthContext";
import { useFuncionario } from "../contexts/FuncionarioContext";
import { useCompany } from "../contexts/CompanyContext";
import AuthStack from "./AuthStack";
import CompanyRegisterStack from "./CompanyRegisterStack";
import AppStack from "./AppStack";
import AdminStack from "./AdminStack";

export default function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const {
    funcionario,
    isHydrating: isHydratingFuncionario,
    logoutFuncionario,
  } = useFuncionario();
  const { company, isLoadingCompany } = useCompany();
  const hasFuncionarioSession = !!funcionario;
  const hasAnySession = isAuthenticated || hasFuncionarioSession;
  const [isDeviceUnlocked, setIsDeviceUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const authenticateDevice = async () => {
    if (!hasAnySession) {
      setIsDeviceUnlocked(true);
      return;
    }

    try {
      setIsUnlocking(true);
      setUnlockError(null);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsDeviceUnlocked(false);
        setUnlockError(
          "Ative biometria ou senha do dispositivo para acessar a sessão automática.",
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirme sua identidade",
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar senha do dispositivo",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsDeviceUnlocked(true);
        setUnlockError(null);
        return;
      }

      setIsDeviceUnlocked(false);
      setUnlockError("Não foi possível validar a autenticação do dispositivo.");
    } catch (error) {
      setIsDeviceUnlocked(false);
      setUnlockError("Falha ao validar segurança do dispositivo.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const forceLogout = async () => {
    try {
      if (isAuthenticated) {
        await logout();
      }
      if (hasFuncionarioSession) {
        await logoutFuncionario();
      }
    } catch (error) {
      console.error("[RootNavigator] Erro ao encerrar sessão:", error);
    }
  };

  useEffect(() => {
    if (!hasAnySession) {
      setIsDeviceUnlocked(true);
      setUnlockError(null);
      return;
    }

    setIsDeviceUnlocked(false);
    authenticateDevice();
  }, [hasAnySession]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        prevState.match(/inactive|background/) &&
        nextState === "active" &&
        hasAnySession
      ) {
        setIsDeviceUnlocked(false);
        authenticateDevice();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasAnySession]);

  if (authLoading || isHydratingFuncionario) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>
          Carregando sessão...
        </Text>
      </View>
    );
  }

  if (hasAnySession && (!isDeviceUnlocked || isUnlocking || unlockError)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        {isUnlocking ? (
          <>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text
              style={{ marginTop: 16, color: "#6B7280", textAlign: "center" }}
            >
              Validando segurança do dispositivo...
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              Acesso protegido
            </Text>
            <Text
              style={{
                color: "#6B7280",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {unlockError ||
                "Confirme com biometria ou senha do dispositivo para continuar."}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#2563EB",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginBottom: 10,
              }}
              onPress={authenticateDevice}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={forceLogout}>
              <Text style={{ color: "#DC2626", fontWeight: "600" }}>
                Sair da conta
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // Mostrar loading APENAS se está carregando dados da empresa após autenticar
  // Durante login, o botão já gira - não precisa de tela de loading global
  if (
    hasAnySession &&
    isLoadingCompany &&
    !company &&
    !user?.necessarioCriarPerfil
  ) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>Carregando...</Text>
      </View>
    );
  }

  if (!isAuthenticated && !hasFuncionarioSession) {
    return <AuthStack />;
  }

  // Se é admin, exibe AdminStack
  if (user?.role === "admin") {
    return <AdminStack />;
  }

  // Se usuário está logado mas não tem perfil global criado ainda, vai para criar empresa/perfil
  if (user?.necessarioCriarPerfil) {
    return <CompanyRegisterStack />;
  }

  // Se é usuário comum (proprietário) e não tem empresa
  if (!company && isAuthenticated) {
    return <CompanyRegisterStack />;
  }

  if (hasFuncionarioSession) {
    return <AppStack />;
  }

  return <AppStack />;
}
