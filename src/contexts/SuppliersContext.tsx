import React, { createContext, useContext, useState, useCallback } from "react";
import { Fornecedor } from "../domains/fornecedores/types";
import {
  checkSupplierDocumentExists,
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSuppliers,
  registerSupplierPurchase,
  updateSupplier,
} from "../services/firebase/supplierService";
import { useCompany } from "./CompanyContext";
import { useAuth } from "./AuthContext";

interface SuppliersContextType {
  fornecedores: Fornecedor[];
  fornecedorSelecionado: Fornecedor | null;
  isLoading: boolean;
  error: string | null;

  loadFornecedores: () => Promise<void>;
  createFornecedor: (
    data: Omit<
      Fornecedor,
      "id" | "empresaId" | "createdAt" | "createdBy" | "updatedAt" | "status"
    >,
  ) => Promise<string>;
  selectFornecedor: (fornecedorId: string) => Promise<void>;
  updateFornecedor: (
    fornecedorId: string,
    updates: Partial<
      Omit<Fornecedor, "id" | "empresaId" | "createdAt" | "createdBy">
    >,
  ) => Promise<void>;
  deleteFornecedor: (fornecedorId: string) => Promise<void>;
  verificarDocumentoFornecedor: (
    cpfCnpj: string,
    excludeFornecedorId?: string,
  ) => Promise<boolean>;
  registrarCompraFornecedor: (
    fornecedorId: string,
    compra: {
      data: Date;
      valor: number;
      descricao?: string;
      produtoIds?: string[];
    },
  ) => Promise<void>;
  clearError: () => void;
  deselectFornecedor: () => void;
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(
  undefined,
);

export function SuppliersProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const { user } = useAuth();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] =
    useState<Fornecedor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFornecedores = useCallback(async () => {
    if (!company?.companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const list = await getSuppliers(company.companyId);
      setFornecedores(list);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar fornecedores";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [company?.companyId]);

  const createFornecedor = useCallback(
    async (
      data: Omit<
        Fornecedor,
        "id" | "empresaId" | "createdAt" | "createdBy" | "updatedAt" | "status"
      >,
    ): Promise<string> => {
      if (!company?.companyId || !user?.id) {
        throw new Error("Empresa ou usuário não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        const exists = await checkSupplierDocumentExists(
          company.companyId,
          data.cpfCnpj,
        );
        if (exists) {
          throw new Error("Documento (CPF/CNPJ) já cadastrado nesta empresa");
        }

        const fornecedorId = await createSupplier(
          company.companyId,
          data,
          user.id,
        );
        await loadFornecedores();
        return fornecedorId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar fornecedor";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [company?.companyId, user?.id, loadFornecedores],
  );

  const selectFornecedor = useCallback(
    async (fornecedorId: string) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        const fornecedor = await getSupplier(company.companyId, fornecedorId);
        if (!fornecedor) {
          throw new Error("Fornecedor não encontrado");
        }

        setFornecedorSelecionado(fornecedor);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao selecionar fornecedor";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [company?.companyId],
  );

  const updateFornecedor = useCallback(
    async (
      fornecedorId: string,
      updates: Partial<
        Omit<Fornecedor, "id" | "empresaId" | "createdAt" | "createdBy">
      >,
    ) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        if (updates.cpfCnpj) {
          const exists = await checkSupplierDocumentExists(
            company.companyId,
            updates.cpfCnpj,
            fornecedorId,
          );
          if (exists) {
            throw new Error(
              "Documento (CPF/CNPJ) já cadastrado por outro fornecedor",
            );
          }
        }

        await updateSupplier(company.companyId, fornecedorId, updates);
        await loadFornecedores();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar fornecedor";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [company?.companyId, loadFornecedores],
  );

  const deleteFornecedor = useCallback(
    async (fornecedorId: string) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        await deleteSupplier(company.companyId, fornecedorId);

        setFornecedores((prev) =>
          prev.filter((item) => item.id !== fornecedorId),
        );

        if (fornecedorSelecionado?.id === fornecedorId) {
          setFornecedorSelecionado(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao arquivar fornecedor";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [company?.companyId, fornecedorSelecionado?.id],
  );

  const verificarDocumentoFornecedor = useCallback(
    (cpfCnpj: string, excludeFornecedorId?: string) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      return checkSupplierDocumentExists(
        company.companyId,
        cpfCnpj,
        excludeFornecedorId,
      );
    },
    [company?.companyId],
  );

  const registrarCompraFornecedor = useCallback(
    async (
      fornecedorId: string,
      compra: {
        data: Date;
        valor: number;
        descricao?: string;
        produtoIds?: string[];
      },
    ) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        await registerSupplierPurchase(company.companyId, fornecedorId, compra);
        await loadFornecedores();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao registrar compra";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [company?.companyId, loadFornecedores],
  );

  const clearError = () => setError(null);
  const deselectFornecedor = () => setFornecedorSelecionado(null);

  const value: SuppliersContextType = {
    fornecedores,
    fornecedorSelecionado,
    isLoading,
    error,
    loadFornecedores,
    createFornecedor,
    selectFornecedor,
    updateFornecedor,
    deleteFornecedor,
    verificarDocumentoFornecedor,
    registrarCompraFornecedor,
    clearError,
    deselectFornecedor,
  };

  return (
    <SuppliersContext.Provider value={value}>
      {children}
    </SuppliersContext.Provider>
  );
}

export function useSuppliers(): SuppliersContextType {
  const context = useContext(SuppliersContext);
  if (!context) {
    throw new Error("useSuppliers deve ser usado dentro de SuppliersProvider");
  }
  return context;
}
