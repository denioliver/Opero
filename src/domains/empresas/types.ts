import { BaseEntity } from '../../types/base';

/**
 * Empresa - Entidade raiz do multi-tenant
 * Cada usuário pode criar UMA única empresa
 * Todas as outras coleções herdam empresaId
 */
export interface Empresa extends BaseEntity {
  // Informações Básicas
  nome: string;
  cnpj: string; // Único no sistema
  
  // Contato
  telefone: string;
  email: string;
  
  // Endereço
  endereco: {
    rua: string;
    numero: string;
    complemento?: string;
  };
  cidade: string;
  estado: string; // UF - 2 caracteres
  cep: string;
  
  // Proprietário (criador)
  proprietarioId: string; // userId
  
  // Status do pagamento/assinatura
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscriptionEndDate?: Date;
}

/**
 * Dados requeridos para criar uma empresa
 */
export type CreateEmpresaInput = Omit<Empresa, 'id' | 'empresaId' | 'createdAt' | 'createdBy' | 'status'>;
