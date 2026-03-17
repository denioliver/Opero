import { BaseEntity } from '../../types/base';

/**
 * Role - Papéis dentro de uma empresa
 * admin: Acesso total, controla sub-usuários e dados
 * manager: Acesso a maioria das operações, não pode gerenciar usuários
 * user: Acesso limitado a leitura e criação de dados específicos
 */
export type UsuarioRole = 'admin' | 'manager' | 'user' | 'viewer';

/**
 * UsuarioEmpresa - Usuário dentro de uma empresa (Firebase user + role)
 * Cada empresa tem sua coleção de usuários
 * Todos os usuários em /empresas/{empresaId}/usuarios/{userId}
 */
export interface UsuarioEmpresa extends BaseEntity {
  // Referência ao usuário Firebase
  firebaseUid: string;
  
  // Informações básicas
  nome: string;
  email: string;
  
  // Role dentro da empresa
  role: UsuarioRole;
  
  // Permissões específicas
  permissoes?: {
    gerenciarClientes: boolean;
    gerenciarProdutos: boolean;
    gerenciarPedidos: boolean;
    verRelatorios: boolean;
    gerenciarUsuarios: boolean;
  };
  
  // Rastreamento
  ultimoAcesso?: Date;
  ativo: boolean;
}

/**
 * Perfil de usuário no nível global (em /usuarios/{userId})
 * Armazena informações gerais do usuário
 */
export interface UsuarioPerfil {
  id: string; // Firebase UID
  email: string;
  nome: string;
  
  // Referência à empresa (usuário só pode ter 1)
  empresaId?: string;
  proprietarioDe?: string; // empresaId que ele é proprietário
  
  // Metadata
  createdAt: Date;
  lastLogin?: Date;
}
