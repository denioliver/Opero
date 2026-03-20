/**
 * Tipos para rastreamento de movimentação de estoque
 */

export type TipoMovimentacao = 
  | 'entrada_compra'
  | 'saida_venda'
  | 'ajuste_manual'
  | 'devolucao_cliente'
  | 'devolucao_fornecedor'
  | 'inventario';

export interface MovimentacaoEstoque {
  movimentacaoId: string;
  companyId: string;
  produtoId: string;
  
  // Tipo e quantidade
  tipo: TipoMovimentacao;
  quantidade: number;
  saldoAnterior: number;
  saldoAtual: number;
  
  // Referências
  orderId?: string; // Referência a Ordem de Serviço ou Compra
  novoId?: string; // Referência a Nota Fiscal
  fornecedorId?: string;
  clienteId?: string;
  
  // Rastreamento
  descricao?: string;
  observacoes?: string;
  criadoPor: string; // ID do usuário
  
  // Timestamps
  data: Date;
  createdAt: Date;
}

export interface UltimaCompra {
  produtoId: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  dataCompra: Date;
  quantidadeComprada: number;
  precoUnitario: number;
  precoTotal: number;
}

export interface UltimaVenda {
  produtoId: string;
  clienteId?: string;
  clienteNome?: string;
  dataVenda: Date;
  quantidadeVendida: number;
  precoUnitario: number;
  precoTotal: number;
}

export interface RelatorioEstoque {
  produtoId: string;
  nomeProduto: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  precoCompra: number;
  precoVenda: number;
  valorTotalEstoque: number; // estoqueAtual * precoCompra
  margemLucro: number; // percentual
  status: 'critico' | 'baixo' | 'normal' | 'excesso';
}

export interface RelatorioProdutosMaisVendidos {
  produtoId: string;
  nomeProduto: string;
  quantidadeVendida: number;
  receita: number;
  percentualReceita: number;
  ticket: number; // receita / número de transações
}

export interface RelatorioGiroEstoque {
  produtoId: string;
  nomeProduto: string;
  vendidoUltimos30Dias: number;
  estoqueAtual: number;
  giroEstoque: number; // vendido / estoque (quanto rápido vira)
  diasParaEsgotar: number; // 30 / giroEstoque
}

export interface AlertaEstoque {
  alertaId: string;
  companyId: string;
  produtoId: string;
  nomeProduto: string;
  tipo: 'minimo' | 'maximo' | 'critico';
  descricao: string;
  estoqueAtual: number;
  valorMinimo: number;
  urgencia: 'baixa' | 'media' | 'alta';
  lido: boolean;
  createdAt: Date;
}
