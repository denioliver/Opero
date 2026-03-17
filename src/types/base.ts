import { Timestamp } from 'firebase/firestore';

/**
 * BaseEntity - Entidade base que todas as collections herdam
 * Garante consistência em metadados através de toda a aplicação
 */
export interface BaseEntity {
  id: string;
  empresaId: string;
  createdAt: Timestamp | Date;
  createdBy: string; // userId do criador
  updatedAt?: Timestamp | Date;
  status: 'active' | 'inactive' | 'deleted';
}

/**
 * UserRole - Roles disponíveis dentro de uma empresa
 */
export type UserRole = 'admin' | 'user' | 'viewer';

/**
 * User - Usuário do sistema Firebase
 */
export interface User {
  id: string; // Firebase UID
  email: string;
  name: string;
  empresaId?: string; // ID da empresa do usuário (se criou uma)
  role?: UserRole; // Role dentro da empresa
  createdAt: Timestamp | Date;
  lastLogin?: Timestamp | Date;
}
