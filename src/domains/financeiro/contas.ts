export type PedidoStatus = "aberto" | "faturado" | "cancelado";

export interface PedidoItem {
  itemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PedidoVenda {
  pedidoId: string;
  companyId: string;
  clienteId: string;
  clienteNome?: string;
  vendedorId: string;
  vendedorNome?: string;
  itens: PedidoItem[];
  subtotal: number;
  desconto: number;
  total: number;
  status: PedidoStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ContaReceberStatus = "pendente" | "pago" | "atrasado";

export interface ContaReceber {
  contaReceberId: string;
  companyId: string;
  clienteId: string;
  clienteNome?: string;
  pedidoId: string;
  invoiceId?: string;
  valor: number;
  dataVencimento: Date;
  status: ContaReceberStatus;
  formaPagamento?: string;
  parcela?: number;
  totalParcelas?: number;
  dataPagamento?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContaPagarTipo = "compra" | "despesa";
export type ContaPagarStatus = "pendente" | "pago" | "atrasado" | "cancelado";

export interface ContaPagar {
  contaPagarId: string;
  companyId: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  valor: number;
  dataVencimento: Date;
  status: ContaPagarStatus;
  tipo: ContaPagarTipo;
  descricao?: string;
  formaPagamento?: string;
  recorrencia?: "nenhuma" | "mensal" | "trimestral" | "anual";
  proximaRecorrencia?: Date;
  dataPagamento?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertaSistemaTipo =
  | "estoque_minimo"
  | "pagamento_atrasado"
  | "cliente_bloqueado"
  | "financeiro";

export interface AlertaSistema {
  alertaId: string;
  companyId: string;
  tipo: AlertaSistemaTipo;
  titulo: string;
  descricao: string;
  origemId?: string;
  lido: boolean;
  createdAt: Date;
}
