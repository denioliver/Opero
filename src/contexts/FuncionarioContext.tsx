/**
 * Contexto de Funcionário
 * Gerencia a sessão do funcionário logado (nome + senha, sem Firebase)
 */

import React, { createContext, useState, useContext, useCallback } from "react";
import { FuncionarioContexto } from "../domains/auth/types";
import { autenticarFuncionarioPorNome } from "../services/firebase/funcionarioService";

interface FuncionarioContextType {
  // Sessão do funcionário logado
  funcionario: FuncionarioContexto | null;

  // Estados
  isLoading: boolean;
  error: string | null;

  // Métodos
  loginFuncionario: (nome: string, senha: string) => Promise<void>;
  logoutFuncionario: () => void;
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
  const [error, setError] = useState<string | null>(null);

  const loginFuncionario = useCallback(async (nome: string, senha: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const funcionarioData = await autenticarFuncionarioPorNome(nome, senha);

      if (!funcionarioData) {
        throw new Error("Nome ou senha incorretos");
      }

      // Configurar sessão do funcionário
      setFuncionario({
        funcionarioId: funcionarioData.id,
        funcionarioNome: funcionarioData.nome,
        qualificacao: funcionarioData.qualificacao,
        empresaId: funcionarioData.empresaId,
        canAccessAdminCards: !!funcionarioData.canAccessAdminCards,
        adminPermissions: funcionarioData.adminPermissions,
      });

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

  const logoutFuncionario = useCallback(() => {
    setFuncionario(null);
    setError(null);
    console.log("[FuncionarioContext] Funcionário deslogado");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: FuncionarioContextType = {
    funcionario,
    isLoading,
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
