import { Timestamp } from 'firebase/firestore';

export interface Cliente {
  id: string;
  empresaId: string;
  
  nome: string;
  tipo: 'pf' | 'pj';
  documento: string;
  rg?: string;
  sexo?: 'masculino' | 'feminino' | 'outro' | 'nao_informado';
  email?: string;
  telefone?: string;

  razaoSocial?: string;
  nomeFantasia?: string;

  limiteCredito?: number;
  descontoPercentual?: number;
  
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  
  observacoes?: string;
  
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  
  status: 'ativo' | 'bloqueado' | 'inativo';
}
