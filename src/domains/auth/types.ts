/**
 * Tipos para Sistema de Autenticação com Roles e Funcionários
 */

/**
 * Tipos de usuário no sistema
 */
export type UserRole = 'admin' | 'users';

/**
 * Usuário no nível global (em /usuarios/{userId})
 * Admin: Gerencia o app completo
 * Users: Proprietário de empresa
 */
export interface UsuarioGlobal {
  id: string; // Firebase UID
  email: string;
  name: string;
  role: UserRole; // 'admin' ou 'users'
  
  // Apenas para users (proprietários de empresa)
  empresaId?: string;
  
  // Metadata
  createdAt: Date;
  createdBy?: string; // Quem criou este usuário (para admins)
  updatedAt?: Date;
  ativo: boolean;
}

/**
 * Qualificações de funcionário na empresa
 */
export type FuncionarioQualificacao = 
  | 'gerente_geral'
  | 'gerente_tecnico'
  | 'gerente_financeiro'
  | 'vendedor'
  | 'tecnico'
  | 'administrativo'
  | 'financeiro'
  | 'outro';

/**
 * Permissões granulares para as telas de Administração
 */
export type AdminFeature = 'acessos' | 'auditoria' | 'relatorios';
export type AdminPermissions = Partial<Record<AdminFeature, boolean>>;

export type HomeFeature =
  | 'cardFaturamento'
  | 'cardAReceber'
  | 'cardAPagar'
  | 'cardLucro'
  | 'cardEstoqueBaixo'
  | 'atalhoNotasFiscais'
  | 'atalhoContasReceber'
  | 'atalhoContasPagar';
export type HomePermissions = Partial<Record<HomeFeature, boolean>>;

/**
 * Funcionário dentro de uma empresa
 * Armazenado em: /empresas/{empresaId}/funcionarios/{funcionarioId}
 * Login: nome + senha (não usa Firebase Auth)
 */
export interface Funcionario {
  id: string; // Gerado pelo Firestore
  empresaId: string;
  nome: string;
  senha: string; // Hash bcrypt
  qualificacao: FuncionarioQualificacao;
  canAccessAdminCards?: boolean;
  canAccessFinancialDashboard?: boolean;
  adminPermissions?: AdminPermissions;
  homePermissions?: HomePermissions;
  
  // Opcional
  email?: string;
  telefone?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  ativo: boolean;
}

/**
 * Sessão do funcionário logado (não persiste, mantém em RAM)
 */
export interface SessaoFuncionario {
  funcionarioId: string;
  funcionarioNome: string;
  qualificacao: FuncionarioQualificacao;
  empresaId: string;
  logadoEm: Date;
}

/**
 * Log de auditoria para rastrear ações de funcionários
 * Armazenado em: /empresas/{empresaId}/auditoria/{auditId}
 */
export interface AuditoriaLog {
  id: string;
  empresaId: string;
  
  // Quem fez a ação
  funcionarioId: string;
  funcionarioNome: string;
  qualificacao: FuncionarioQualificacao;
  
  // O que foi feito
  acao: string; // 'criar_cliente', 'editar_produto', 'criar_ordem', etc
  colecao: string; // 'clientes', 'produtos', 'ordens', etc
  documentoId: string; // ID do documento afetado
  
  // Como foi feito
  dados: Record<string, any>; // Dados relevantes da ação
  mudancas?: Record<string, any>; // Para edições: antes/depois
  
  // Timestamp
  criadoEm: Date;
}

/**
 * Usuário do contexto React (simplificado para uso em APP)
 */
export interface UserContexto {
  id: string;
  email: string;
  name: string;
  role?: UserRole; // 'admin' ou 'users' - undefined se pendente de criação
  empresaId?: string; // Preenchido apenas para users
  necessarioCriarPerfil?: boolean; // true se logou mas não tem documento global ainda
}

/**
 * Funcionário do contexto React (sessão ativa)
 */
export interface FuncionarioContexto {
  funcionarioId: string;
  funcionarioNome: string;
  qualificacao: FuncionarioQualificacao;
  empresaId: string;
  canAccessAdminCards?: boolean;
  canAccessFinancialDashboard?: boolean;
  adminPermissions?: AdminPermissions;
  homePermissions?: HomePermissions;
}
