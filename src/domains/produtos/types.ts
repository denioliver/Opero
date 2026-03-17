import { BaseEntity } from '../base';

export type ProdutoTipo = 'produto' | 'servico';

export interface Produto extends BaseEntity {
  nome: string;
  descricao?: string;
  tipo: ProdutoTipo;
  preco: number;
  custo?: number;
  estoque?: number;
  unidade?: string; // 'un', 'kg', 'h', etc
  categoria?: string;
  sku?: string;
  imagem?: string;
}
