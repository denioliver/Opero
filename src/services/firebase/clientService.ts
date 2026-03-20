/**
 * Client Service - CRUD de Clientes por Empresa
 * Todos os clientes são armazenados em /empresas/{empresaId}/clientes/{clienteId}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Cliente } from '../../domains/clientes/types';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const removeUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (isPlainObject(value)) {
    const cleanedEntries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)]);

    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
};

/**
 * Cria um novo cliente
 * @param empresaId - ID da empresa
 * @param clientData - Dados do cliente (sem id, empresaId, createdAt)
 * @param userId - ID do usuário criador
 * @returns ID do cliente criado
 */
export async function createClient(
  empresaId: string,
  clientData: Omit<Cliente, 'id' | 'empresaId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'status'>,
  userId: string
): Promise<string> {
  try {
    console.log('[clientService] Criando cliente na empresa:', empresaId);

    // Gera referência com ID único
    const clientesRef = collection(db, 'empresas', empresaId, 'clientes');
    const newClientRef = doc(clientesRef);
    const clienteId = newClientRef.id;

    // Prepara dados do cliente
    const cliente: Cliente = {
      id: clienteId,
      empresaId,
      ...clientData,
      limiteCredito: clientData.limiteCredito ?? 0,
      descontoPercentual: clientData.descontoPercentual ?? 0,
      createdAt: serverTimestamp() as Timestamp,
      createdBy: userId,
      status: 'ativo',
    };

    const clienteSemUndefined = removeUndefinedDeep(cliente);

    await setDoc(newClientRef, clienteSemUndefined);
    console.log('[clientService] Cliente criado:', clienteId);

    return clienteId;
  } catch (error) {
    console.error('[clientService] Erro ao criar cliente:', error);
    throw error;
  }
}

/**
 * Obtém todos os clientes da empresa com filtros opcionais
 * @param empresaId - ID da empresa
 * @param statusFilter - Filtrar por status ('ativo', 'bloqueado' ou 'inativo')
 * @param sortBy - Campo para ordenação
 * @returns Lista de clientes
 */
export async function getClients(
  empresaId: string,
  statusFilter?: 'ativo' | 'bloqueado' | 'inativo',
  sortBy: 'nome' | 'createdAt' = 'nome'
): Promise<Cliente[]> {
  try {
    console.log('[clientService] Buscando clientes da empresa:', empresaId);

    const clientesRef = collection(db, 'empresas', empresaId, 'clientes');
    const snapshot = await getDocs(clientesRef);

    console.log('[clientService] Clientes encontrados:', snapshot.size);

    let clientes = snapshot.docs.map((item) => item.data() as Cliente);

    if (statusFilter) {
      clientes = clientes.filter((cliente) => cliente.status === statusFilter);
    }

    const getCreatedAtMs = (cliente: Cliente): number => {
      const createdAt: any = cliente.createdAt;
      if (!createdAt) return 0;

      if (typeof createdAt?.toMillis === 'function') {
        return createdAt.toMillis();
      }

      if (createdAt instanceof Date) {
        return createdAt.getTime();
      }

      if (typeof createdAt?.seconds === 'number') {
        return createdAt.seconds * 1000;
      }

      const parsed = new Date(createdAt as any).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    clientes.sort((first, second) => {
      if (sortBy === 'nome') {
        return (first.nome || '').localeCompare(second.nome || '', 'pt-BR');
      }

      return getCreatedAtMs(first) - getCreatedAtMs(second);
    });

    return clientes;
  } catch (error) {
    console.error('[clientService] Erro ao buscar clientes:', error);
    throw error;
  }
}

/**
 * Obtém um cliente específico
 * @param empresaId - ID da empresa
 * @param clienteId - ID do cliente
 * @returns Dados do cliente ou null
 */
export async function getClient(
  empresaId: string,
  clienteId: string
): Promise<Cliente | null> {
  try {
    const clientRef = doc(db, 'empresas', empresaId, 'clientes', clienteId);
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists()) {
      return null;
    }

    return clientSnap.data() as Cliente;
  } catch (error) {
    console.error('[clientService] Erro ao buscar cliente:', error);
    throw error;
  }
}

/**
 * Atualiza dados de um cliente
 * @param empresaId - ID da empresa
 * @param clienteId - ID do cliente
 * @param updates - Campos a atualizar
 * @param userId - ID do usuário fazendo a atualização
 */
export async function updateClient(
  empresaId: string,
  clienteId: string,
  updates: Partial<Omit<Cliente, 'id' | 'empresaId' | 'createdAt' | 'createdBy'>>,
  userId: string
): Promise<void> {
  try {
    console.log('[clientService] Atualizando cliente:', clienteId);

    const clientRef = doc(db, 'empresas', empresaId, 'clientes', clienteId);

    const updatePayload = removeUndefinedDeep({
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(clientRef, updatePayload);

    console.log('[clientService] Cliente atualizado:', clienteId);
  } catch (error) {
    console.error('[clientService] Erro ao atualizar cliente:', error);
    throw error;
  }
}

/**
 * Deleta um cliente (soft delete - marca como deleted)
 * @param empresaId - ID da empresa
 * @param clienteId - ID do cliente
 */
export async function deleteClient(
  empresaId: string,
  clienteId: string
): Promise<void> {
  try {
    console.log('[clientService] Deletando cliente:', clienteId);

    const clientRef = doc(db, 'empresas', empresaId, 'clientes', clienteId);

    await updateDoc(clientRef, {
      status: 'inativo',
      updatedAt: serverTimestamp(),
    });

    console.log('[clientService] Cliente deletado (soft):', clienteId);
  } catch (error) {
    console.error('[clientService] Erro ao deletar cliente:', error);
    throw error;
  }
}

/**
 * Valida se documento (CPF/CNPJ) já existe na empresa
 * @param empresaId - ID da empresa
 * @param documento - Número do documento
 * @param excludeClienteId - ID do cliente para excluir da busca (para updates)
 * @returns true se já existe
 */
export async function checkDocumentExists(
  empresaId: string,
  documento: string,
  excludeClienteId?: string
): Promise<boolean> {
  try {
    const clientesRef = collection(db, 'empresas', empresaId, 'clientes');
    const q = query(clientesRef, where('documento', '==', documento));

    const snapshot = await getDocs(q);

    const ativos = snapshot.docs.filter((item) => item.data().status !== 'inativo');

    if (ativos.length === 0) {
      return false;
    }

    // Se está fazendo update, verifica se é o mesmo cliente
    if (excludeClienteId && ativos.length === 1) {
      return ativos[0].id !== excludeClienteId;
    }

    return ativos.length > 0;
  } catch (error) {
    console.error('[clientService] Erro ao verificar documento:', error);
    return false;
  }
}
