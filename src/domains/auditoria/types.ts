import { BaseEntity } from '../base';

export type NotificacaoTipo = 'ordem' | 'cliente' | 'financeiro' | 'produto' | 'sistema';

export interface Notificacao extends BaseEntity {
  usuarioId: string;
  titulo: string;
  mensagem: string;
  tipo: NotificacaoTipo;
  lida: boolean;
  referenciaId?: string; // ID da ordem, cliente, etc
}

export type AuditoriaAcao = 'create' | 'update' | 'delete';
export type AuditoriaEntidade = 'cliente' | 'produto' | 'ordem' | 'nota_fiscal' | 'usuario' | 'empresa';

export interface LogAuditoria extends BaseEntity {
  usuarioId: string;
  acao: AuditoriaAcao;
  entidade: AuditoriaEntidade;
  entidadeId: string;
  alteracoes?: {
    antes?: Record<string, any>;
    depois?: Record<string, any>;
  };
  ipAddress?: string;
}
