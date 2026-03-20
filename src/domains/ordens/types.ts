import { BaseEntity } from '../../types/base';
import { Timestamp } from 'firebase/firestore';

export type OrdemStatus = 'aberta' | 'em_progresso' | 'concluida' | 'cancelada';

type BaseEntitySemStatus = Omit<BaseEntity, 'status'>;

export interface OrdemItem extends BaseEntity {
  ordemId: string;
  produtoId?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface OrdemServico extends BaseEntitySemStatus {
  clienteId: string;
  titulo: string;
  descricao?: string;
  status: OrdemStatus;
  dataAbertura: Timestamp | Date;
  dataFechamento?: Timestamp | Date;
  dataVencimento?: Timestamp | Date;
  tecnicoResponsavel?: string;
  itens: OrdemItem[]; // Cache dos itens
  total: number;
  desconto?: number;
  observacoes?: string;
}
