/**
 * Contexto de Funcionário
 * Gerencia a sessão do funcionário logado (nome + senha, sem Firebase)
 */

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FuncionarioContexto } from "../domains/auth/types";
import { autenticarFuncionarioPorNome } from "../services/firebase/funcionarioService";

const FUNCIONARIO_SESSION_KEY = "@opero:funcionario_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface FuncionarioContextType {
  // Sessão do funcionário logado
  funcionario: FuncionarioContexto | null;

  // Estados
  isLoading: boolean;
  isHydrating: boolean;
  error: string | null;

  // Métodos
  loginFuncionario: (nome: string, senha: string) => Promise<void>;
  logoutFuncionario: () => Promise<void>;
  clearError: () => void;
}

const FuncionarioContext = createContext<FuncionarioContextType | undefined>(
  undefined,
);

export const FuncionarioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [funcionario, setFuncionario] = useState<FuncionarioContexto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(FUNCIONARIO_SESSION_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          data: FuncionarioContexto;
          sessionStartedAt: number;
        };

        if (!parsed?.data?.funcionarioId || !parsed?.data?.empresaId) {
          await AsyncStorage.removeItem(FUNCIONARIO_SESSION_KEY);
          return;
        }

        if (
          parsed?.sessionStartedAt &&
          Date.now() - parsed.sessionStartedAt > SESSION_MAX_AGE_MS
        ) {
          await AsyncStorage.removeItem(FUNCIONARIO_SESSION_KEY);
          return;
        }

        setFuncionario(parsed.data);
        console.log(
          "[FuncionarioContext] Sessão restaurada:",
          parsed.data.funcionarioNome,
        );
      } catch (err) {
        console.error("[FuncionarioContext] Erro ao restaurar sessão:", err);
        await AsyncStorage.removeItem(FUNCIONARIO_SESSION_KEY);
      } finally {
        setIsHydrating(false);
      }
    };

    restoreSession();
  }, []);

  const loginFuncionario = useCallback(async (nome: string, senha: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const funcionarioData = await autenticarFuncionarioPorNome(nome, senha);

      if (!funcionarioData) {
        throw new Error("Nome ou senha incorretos");
      }

      // Configurar sessão do funcionário
      const nextSession: FuncionarioContexto = {
        funcionarioId: funcionarioData.id,
        funcionarioNome: funcionarioData.nome,
        qualificacao: funcionarioData.qualificacao,
        empresaId: funcionarioData.empresaId,
        readOnlyAccess: !!funcionarioData.readOnlyAccess,
        canAccessAdminCards: !!funcionarioData.canAccessAdminCards,
        canAccessFinancialDashboard:
          funcionarioData.canAccessFinancialDashboard !== false,
        adminPermissions: funcionarioData.adminPermissions,
        homePermissions: funcionarioData.homePermissions,
      };

      setFuncionario(nextSession);
      await AsyncStorage.setItem(
        FUNCIONARIO_SESSION_KEY,
        JSON.stringify({
          data: nextSession,
          sessionStartedAt: Date.now(),
        }),
      );

      console.log("[FuncionarioContext] Funcionário logado:", nome);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao fazer login";
      setError(message);
      console.error("[FuncionarioContext] Erro no login:", message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutFuncionario = useCallback(async () => {
    setFuncionario(null);
    setError(null);
    await AsyncStorage.removeItem(FUNCIONARIO_SESSION_KEY);
    console.log("[FuncionarioContext] Funcionário deslogado");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: FuncionarioContextType = {
    funcionario,
    isLoading,
    isHydrating,
    error,
    loginFuncionario,
    logoutFuncionario,
    clearError,
  };

  return (
    <FuncionarioContext.Provider value={value}>
      {children}
    </FuncionarioContext.Provider>
  );
};

export const useFuncionario = () => {
  const context = useContext(FuncionarioContext);
  if (context === undefined) {
    throw new Error(
      "useFuncionario deve ser usado dentro de FuncionarioProvider",
    );
  }
  return context;
};
