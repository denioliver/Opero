import { BaseEntity } from '../base';

export interface Cliente extends BaseEntity {
  nome: string;
  telefone?: string;
  email?: string;
  documento: string; // CPF ou CNPJ
  tipoDocumento: 'cpf' | 'cnpj';
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  observacoes?: string;
}
