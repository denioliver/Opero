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
import { useFuncionario } from "./FuncionarioContext";
import { registrarAuditoria } from "../services/firebase/auditoriaService";
import { requireDeviceSecurity } from "../utils/deviceSecurity";

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
  const { funcionario } = useFuncionario();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] =
    useState<Fornecedor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assertCanWrite = useCallback(async () => {
    if (funcionario?.readOnlyAccess) {
      throw new Error(
        "Seu acesso está em modo somente visualização. Você pode apenas consultar dados.",
      );
    }
    await requireDeviceSecurity("executar esta ação");
  }, [funcionario?.readOnlyAccess]);

  const getActor = useCallback(() => {
    if (!company?.companyId) {
      return null;
    }

    if (funcionario) {
      return {
        funcionarioId: funcionario.funcionarioId,
        funcionarioNome: funcionario.funcionarioNome,
        qualificacao: funcionario.qualificacao,
        empresaId: company.companyId,
      };
    }

    if (!user?.id) {
      return null;
    }

    const nomeUsuario = (user.name || "").trim();
    const nomeProprietario = (company.ownerName || "").trim();
    const nomeGenerico = /^(usu[aá]rio|usuario|user)$/i.test(nomeUsuario);
    const proprietarioGenerico = /^(usu[aá]rio|usuario|user)$/i.test(
      nomeProprietario,
    );

    return {
      funcionarioId: user.id,
      funcionarioNome:
        (!nomeGenerico && nomeUsuario) ||
        (!proprietarioGenerico && nomeProprietario) ||
        user.email ||
        "Proprietário",
      qualificacao: "outro" as const,
      empresaId: company.companyId,
    };
  }, [company?.companyId, funcionario, user?.email, user?.id, user?.name]);

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
      await assertCanWrite();

      if (!company?.companyId || (!user?.id && !funcionario?.funcionarioId)) {
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
          user?.id || funcionario?.funcionarioId || "usuario_indefinido",
        );

        const actor = getActor();
        if (actor) {
          await registrarAuditoria(
            company.companyId,
            actor,
            "criar_fornecedor",
            "fornecedores",
            fornecedorId,
            {
              nome: data.nome,
              cpfCnpj: data.cpfCnpj,
            },
          );
        }

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
    [assertCanWrite, company?.companyId, user?.id, getActor, loadFornecedores],
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
      await assertCanWrite();

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

        const actor = getActor();
        if (actor) {
          await registrarAuditoria(
            company.companyId,
            actor,
            "editar_fornecedor",
            "fornecedores",
            fornecedorId,
            { updates },
          );
        }

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
    [assertCanWrite, company?.companyId, getActor, loadFornecedores],
  );

  const deleteFornecedor = useCallback(
    async (fornecedorId: string) => {
      await assertCanWrite();

      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        await deleteSupplier(company.companyId, fornecedorId);

        const actor = getActor();
        if (actor) {
          await registrarAuditoria(
            company.companyId,
            actor,
            "deletar_fornecedor",
            "fornecedores",
            fornecedorId,
            { status: "inativo" },
          );
        }

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
    [assertCanWrite, company?.companyId, getActor, fornecedorSelecionado?.id],
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
      await assertCanWrite();

      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        setIsLoading(true);
        setError(null);

        await registerSupplierPurchase(company.companyId, fornecedorId, compra);

        const actor = getActor();
        if (actor) {
          await registrarAuditoria(
            company.companyId,
            actor,
            "registrar_compra_fornecedor",
            "fornecedores",
            fornecedorId,
            {
              valor: compra.valor,
              data: compra.data,
              descricao: compra.descricao,
              produtoIds: compra.produtoIds || [],
            },
          );
        }

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
    [assertCanWrite, company?.companyId, getActor, loadFornecedores],
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
