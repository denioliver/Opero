import { BaseEntity } from '../../types/base';

export type ProdutoTipo = 'produto' | 'servico';
export type UnidadeMedida = 'UN' | 'CX' | 'PCT' | 'M2' | 'KG' | 'L' | 'H' | 'M';
export type OrigemMercadoria = 'importacao' | 'nacional' | 'mista';
export type CategoriaFiscal = 'simples' | 'icms' | 'ipi' | 'iss' | 'isento';
export type ResponsavelReposicao = 'empresa' | 'funcionario';
export type StatusProduto = 'ativo' | 'inativo' | 'descontinuado';

export interface Produto {
  produtoId: string;
  nome: string;
  descricao?: string;
  tipo: ProdutoTipo;
  
  // Unidade de medida padronizada
  unidade: UnidadeMedida;
  
  // Preços
  precoCompra: number; // Preço de custo
  precoVenda: number; // Preço de venda
  
  // Controle de estoque
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  
  // Informações adicionais
  categoria: string;
  sku?: string;
  imagem?: string;
  
  // Origem e fiscal
  origemMercadoria: OrigemMercadoria;
  possuiImposto: boolean;
  categoriaFiscal: CategoriaFiscal;
  geraNotaFiscal: boolean;
  
  // Custos
  custoAdicional?: number; // Embalagem, frete interno, etc
  
  // Reposição
  responsavelReposicao: ResponsavelReposicao;
  
  // Status e ativo
  statusProduto: StatusProduto;
  ativo: boolean;
  
  // Auditoria e rastreamento
  companyId: string;
  criadoPor?: string; // ID do usuário
  atualizadoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
