import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company } from '../types';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  company: Company | null;
  isLoadingCompany: boolean;
  companyError: string | null;
  registerCompany: (companyData: Omit<Company, 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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

        // Buscar empresa pelo userId
        const companyDoc = await getDoc(doc(db, 'companies', user.id));

        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as Company;
          setCompany({
            ...companyData,
            companyId: companyDoc.id,
          });
        } else {
          setCompany(null);
        }
      } catch (error) {
        console.error('[CompanyContext] Erro ao buscar empresa:', error);
        setCompanyError('Erro ao carregar empresa');
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
    companyData: Omit<Company, 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setIsLoadingCompany(true);
      setCompanyError(null);

      const newCompany: Company = {
        ...companyData,
        companyId: user.id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Salvar no Firestore com ID = userId (uma empresa por usuário)
      await setDoc(doc(db, 'companies', user.id), {
        ...newCompany,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setCompany(newCompany);
    } catch (error) {
      console.error('[CompanyContext] Erro ao registrar empresa:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar empresa';
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
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setIsLoadingCompany(true);
      setCompanyError(null);

      const companyRef = doc(db, 'companies', user.id);

      await updateDoc(companyRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Atualizar state local
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
              updatedAt: new Date(),
            }
          : null
      );
    } catch (error) {
      console.error('[CompanyContext] Erro ao atualizar empresa:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar empresa';
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
      const companyDoc = await getDoc(doc(db, 'companies', user.id));
      return companyDoc.exists();
    } catch (error) {
      console.error('[CompanyContext] Erro ao verificar empresa:', error);
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

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

/**
 * Hook para usar o contexto de empresa
 */
export function useCompany(): CompanyContextType {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany deve ser usado dentro de CompanyProvider');
  }
  return context;
}
