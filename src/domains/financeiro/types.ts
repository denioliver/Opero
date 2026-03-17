import { BaseEntity } from '../base';
import { Timestamp } from 'firebase/firestore';

export type NotaFiscalStatus = 'rascunho' | 'emitida' | 'cancelada' | 'autorizada';

export interface NotaFiscal extends BaseEntity {
  clienteId: string;
  ordemId?: string;
  numero: string;
  serie: string;
  dataEmissao: Timestamp | Date;
  status: NotaFiscalStatus;
  valor: number;
  impostos?: {
    icms?: number;
    pis?: number;
    cofins?: number;
    ipi?: number;
    issqn?: number;
  };
  desconto?: number;
  observacoes?: string;
  chaveAcesso?: string;
  protocolo?: string;
}

export interface Financeiro extends BaseEntity {
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  categoria: string;
  dataMovimentacao: Timestamp | Date;
  dataPagamento?: Timestamp | Date;
  notaFiscalId?: string;
  metodo?: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'cheque';
  pago: boolean;
}
