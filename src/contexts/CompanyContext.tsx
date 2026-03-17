import React, { createContext, useContext, useState, useEffect } from "react";
import { Company } from "../types";
import { db } from "../config/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import {
  getCompany,
  checkUserHasCompany,
  getUserCompanyId,
} from "../services/firebase/companyService";
import { createCompanyFixed } from "../services/firebase/companyServiceFix";

interface CompanyContextType {
  company: Company | null;
  isLoadingCompany: boolean;
  companyError: string | null;
  registerCompany: (
    companyData: Omit<
      Company,
      "companyId" | "userId" | "createdAt" | "updatedAt"
    >,
  ) => Promise<void>;
  updateCompany: (updates: Partial<Company>) => Promise<void>;
  checkCompanyExists: () => Promise<boolean>;
  clearCompanyError: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  /**
   * Busca a empresa do usuário atual
   */
  useEffect(() => {
    if (!user?.id) {
      setCompany(null);
      setIsLoadingCompany(false);
      return;
    }

    const fetchCompany = async () => {
      try {
        setIsLoadingCompany(true);
        setCompanyError(null);

        // Buscar empresaId do usuário
        const empresaId = await getUserCompanyId(user.id);

        if (empresaId) {
          // Buscar dados da empresa
          const companyData = await getCompany(empresaId);
          if (companyData) {
            setCompany(companyData);
          } else {
            setCompany(null);
          }
        } else {
          setCompany(null);
        }
      } catch (error) {
        console.error("[CompanyContext] Erro ao buscar empresa:", error);
        setCompanyError("Erro ao carregar empresa");
      } finally {
        setIsLoadingCompany(false);
      }
    };

    fetchCompany();
  }, [user?.id]);

  /**
   * Registra uma nova empresa para o usuário
   */
  const registerCompany = async (
    companyData: Omit<
      Company,
      "companyId" | "userId" | "createdAt" | "updatedAt"
    >,
  ) => {
    if (!user?.id) {
      throw new Error("Usuário não autenticado");
    }

    try {
      console.log(
        "[CompanyContext] Registrando empresa para usuário:",
        user.id,
      );
      setIsLoadingCompany(true);
      setCompanyError(null);

      // Usar o service corrigido para criar empresa com validações
      const empresaId = await createCompanyFixed(companyData, user.id);
      console.log("[CompanyContext] Empresa criada com ID:", empresaId);

      // Buscar os dados da empresa criada
      const newCompany = await getCompany(empresaId);
      if (newCompany) {
        console.log(
          "[CompanyContext] Dados da empresa carregados:",
          newCompany,
        );
        setCompany(newCompany);
      }
    } catch (error) {
      console.error("[CompanyContext] Erro ao registrar empresa:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao registrar empresa";
      setCompanyError(errorMessage);
      throw error;
    } finally {
      setIsLoadingCompany(false);
    }
  };

  /**
   * Atualiza os dados da empresa existente
   */
  const updateCompany = async (updates: Partial<Company>) => {
    if (!company?.companyId) {
      throw new Error("Nenhuma empresa carregada");
    }

    try {
      setIsLoadingCompany(true);
      setCompanyError(null);

      const companyRef = doc(db, "empresas", company.companyId);

      await updateDoc(companyRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Atualizar state local
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
            }
          : null,
      );
    } catch (error) {
      console.error("[CompanyContext] Erro ao atualizar empresa:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao atualizar empresa";
      setCompanyError(errorMessage);
      throw error;
    } finally {
      setIsLoadingCompany(false);
    }
  };

  /**
   * Verifica se o usuário já tem uma empresa cadastrada
   */
  const checkCompanyExists = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      return await checkUserHasCompany(user.id);
    } catch (error) {
      console.error("[CompanyContext] Erro ao verificar empresa:", error);
      return false;
    }
  };

  const clearCompanyError = () => {
    setCompanyError(null);
  };

  const value: CompanyContextType = {
    company,
    isLoadingCompany,
    companyError,
    registerCompany,
    updateCompany,
    checkCompanyExists,
    clearCompanyError,
  };

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

/**
 * Hook para usar o contexto de empresa
 */
export function useCompany(): CompanyContextType {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany deve ser usado dentro de CompanyProvider");
  }
  return context;
}
