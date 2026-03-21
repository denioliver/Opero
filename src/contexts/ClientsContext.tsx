/**
 * Clientes Context - Gerenciamento de clientes da empresa
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { Cliente } from "../domains/clientes/types";
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  checkDocumentExists,
} from "../services/firebase/clientService";
import { useCompany } from "./CompanyContext";
import { useAuth } from "./AuthContext";
import { useFuncionario } from "./FuncionarioContext";
import { registrarAuditoria } from "../services/firebase/auditoriaService";
import { requireDeviceSecurity } from "../utils/deviceSecurity";

interface ClientsContextType {
  // Estado
  clientes: Cliente[];
  clienteSelecionado: Cliente | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  loadClientes: () => Promise<void>;
  createCliente: (
    clientData: Omit<
      Cliente,
      "id" | "empresaId" | "createdAt" | "createdBy" | "updatedAt" | "status"
    >,
  ) => Promise<string>;
  selectCliente: (clienteId: string) => Promise<void>;
  updateCliente: (
    clienteId: string,
    updates: Partial<
      Omit<Cliente, "id" | "empresaId" | "createdAt" | "createdBy">
    >,
  ) => Promise<void>;
  deleteCliente: (clienteId: string) => Promise<void>;
  verificarDocumento: (
    documento: string,
    excludeClienteId?: string,
  ) => Promise<boolean>;
  clearError: () => void;
  deselectCliente: () => void;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(
    null,
  );
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

  /**
   * Carrega todos os clientes da empresa
   */
  const loadClientes = useCallback(async () => {
    if (!company?.companyId) {
      console.warn("[ClientsContext] Empresa não carregada");
      return;
    }

    try {
      console.log("[ClientsContext] Carregando clientes...");
      setIsLoading(true);
      setError(null);

      const clientesList = await getClients(
        company.companyId,
        undefined,
        "nome",
      );
      setClientes(clientesList);

      console.log("[ClientsContext] Clientes carregados:", clientesList.length);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar clientes";
      console.error("[ClientsContext] Erro:", message);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [company?.companyId]);

  /**
   * Cria um novo cliente
   */
  const createCliente = useCallback(
    async (
      clientData: Omit<
        Cliente,
        "id" | "empresaId" | "createdAt" | "createdBy" | "updatedAt" | "status"
      >,
    ): Promise<string> => {
      await assertCanWrite();

      if (!company?.companyId || !user?.id) {
        throw new Error("Empresa ou usuário não disponível");
      }

      try {
        console.log("[ClientsContext] Criando cliente...");
        setIsLoading(true);
        setError(null);

        // Verifica se documento já existe
        const exists = await checkDocumentExists(
          company.companyId,
          clientData.documento,
        );
        if (exists) {
          throw new Error("Documento (CPF/CNPJ) já cadastrado nesta empresa");
        }

        const clienteId = await createClient(
          company.companyId,
          clientData,
          user.id,
        );

        const actor = funcionario
          ? {
              funcionarioId: funcionario.funcionarioId,
              funcionarioNome: funcionario.funcionarioNome,
              qualificacao: funcionario.qualificacao,
              empresaId: company.companyId,
            }
          : {
              funcionarioId: user.id,
              funcionarioNome: user.name || user.email,
              qualificacao: "outro" as any,
              empresaId: company.companyId,
            };

        await registrarAuditoria(
          company.companyId,
          actor,
          "criar_cliente",
          "clientes",
          clienteId,
          {
            nome: clientData.nome,
            documento: clientData.documento,
          },
        );

        // Recarrega lista
        await loadClientes();

        console.log("[ClientsContext] Cliente criado:", clienteId);
        return clienteId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao criar cliente";
        console.error("[ClientsContext] Erro:", message);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [assertCanWrite, company?.companyId, user?.id, loadClientes],
  );

  /**
   * Seleciona um cliente para visualizar/editar
   */
  const selectCliente = useCallback(
    async (clienteId: string) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        console.log("[ClientsContext] Selecionando cliente:", clienteId);
        setIsLoading(true);
        setError(null);

        const cliente = await getClient(company.companyId, clienteId);
        if (!cliente) {
          throw new Error("Cliente não encontrado");
        }

        setClienteSelecionado(cliente);
        console.log("[ClientsContext] Cliente selecionado");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao selecionar cliente";
        console.error("[ClientsContext] Erro:", message);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [company?.companyId],
  );

  /**
   * Atualiza um cliente
   */
  const updateCliente = useCallback(
    async (
      clienteId: string,
      updates: Partial<
        Omit<Cliente, "id" | "empresaId" | "createdAt" | "createdBy">
      >,
    ) => {
      await assertCanWrite();

      if (!company?.companyId || !user?.id) {
        throw new Error("Empresa ou usuário não disponível");
      }

      try {
        console.log("[ClientsContext] Atualizando cliente:", clienteId);
        setIsLoading(true);
        setError(null);

        // Se atualizando documento, verifica se já existe
        if (updates.documento) {
          const exists = await checkDocumentExists(
            company.companyId,
            updates.documento,
            clienteId,
          );
          if (exists) {
            throw new Error(
              "Documento (CPF/CNPJ) já cadastrado por outro cliente",
            );
          }
        }

        await updateClient(company.companyId, clienteId, updates, user.id);

        const actor = funcionario
          ? {
              funcionarioId: funcionario.funcionarioId,
              funcionarioNome: funcionario.funcionarioNome,
              qualificacao: funcionario.qualificacao,
              empresaId: company.companyId,
            }
          : {
              funcionarioId: user.id,
              funcionarioNome: user.name || user.email,
              qualificacao: "outro" as any,
              empresaId: company.companyId,
            };

        await registrarAuditoria(
          company.companyId,
          actor,
          "editar_cliente",
          "clientes",
          clienteId,
          { updates },
        );

        // Recarrega lista
        await loadClientes();

        console.log("[ClientsContext] Cliente atualizado");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar cliente";
        console.error("[ClientsContext] Erro:", message);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [assertCanWrite, company?.companyId, user?.id, loadClientes],
  );

  /**
   * Deleta um cliente
   */
  const deleteCliente = useCallback(
    async (clienteId: string) => {
      await assertCanWrite();

      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }

      try {
        console.log("[ClientsContext] Deletando cliente:", clienteId);
        setIsLoading(true);
        setError(null);

        await deleteClient(company.companyId, clienteId);

        const actor = funcionario
          ? {
              funcionarioId: funcionario.funcionarioId,
              funcionarioNome: funcionario.funcionarioNome,
              qualificacao: funcionario.qualificacao,
              empresaId: company.companyId,
            }
          : {
              funcionarioId: user.id,
              funcionarioNome: user.name || user.email,
              qualificacao: "outro" as any,
              empresaId: company.companyId,
            };

        await registrarAuditoria(
          company.companyId,
          actor,
          "deletar_cliente",
          "clientes",
          clienteId,
          {},
        );

        // Remove da lista local
        setClientes((prev) => prev.filter((c) => c.id !== clienteId));

        // Limpa seleção se era o cliente deletado
        if (clienteSelecionado?.id === clienteId) {
          setClienteSelecionado(null);
        }

        console.log("[ClientsContext] Cliente deletado");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao deletar cliente";
        console.error("[ClientsContext] Erro:", message);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      assertCanWrite,
      company?.companyId,
      user?.id,
      user?.name,
      user?.email,
      funcionario,
      clienteSelecionado?.id,
    ],
  );

  /**
   * Valida documento
   */
  const verificarDocumento = useCallback(
    (documento: string, excludeClienteId?: string) => {
      if (!company?.companyId) {
        throw new Error("Empresa não disponível");
      }
      return checkDocumentExists(
        company.companyId,
        documento,
        excludeClienteId,
      );
    },
    [company?.companyId],
  );

  const clearError = () => setError(null);
  const deselectCliente = () => setClienteSelecionado(null);

  const value: ClientsContextType = {
    clientes,
    clienteSelecionado,
    isLoading,
    error,
    loadClientes,
    createCliente,
    selectCliente,
    updateCliente,
    deleteCliente,
    verificarDocumento,
    clearError,
    deselectCliente,
  };

  return (
    <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
  );
}

/**
 * Hook para usar o contexto de clientes
 */
export function useClients(): ClientsContextType {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error("useClients deve ser usado dentro de ClientsProvider");
  }
  return context;
}
