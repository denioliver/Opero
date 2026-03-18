import { Timestamp } from 'firebase/firestore';

export interface Cliente {
  id: string;
  empresaId: string;
  
  nome: string;
  tipo: 'pf' | 'pj';
  documento: string;
  email?: string;
  telefone?: string;
  
  endereco?: {
    rua: string;
    numero: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  
  observacoes?: string;
  
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  
  status: 'ativo' | 'inativo';
}
