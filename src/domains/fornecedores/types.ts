import { Timestamp } from "firebase/firestore";

export interface CompraFornecedor {
  id: string;
  data: Timestamp | Date;
  valor: number;
  descricao?: string;
  produtoIds?: string[];
}

export interface Fornecedor {
  id: string;
  empresaId: string;

  nome: string;
  cpfCnpj: string;
  telefone?: string;
  email?: string;

  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    cidade: string;
    estado: string;
    cep: string;
  };

  produtosFornecidos: string[];

  prazoEntrega?: string;
  condicaoPagamento?: string;

  status: "ativo" | "bloqueado" | "inativo";

  historicoCompras?: CompraFornecedor[];

  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
}
