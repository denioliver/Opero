/**
 * Serviço de Usuários Globais
 * Gerencia admins e proprietários de empresa
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UsuarioGlobal, UserRole } from '../../domains/auth/types';

/**
 * Cria um usuário global (admin ou users)
 * Chamado após signup bem-sucedido no Firebase Auth
 */
export async function criarUsuarioGlobal(
  userId: string,
  email: string,
  name: string,
  role: UserRole,
  empresaId?: string
): Promise<void> {
  try {
    const usuarioRef = doc(db, 'usuarios', userId);
    
    const usuarioData: UsuarioGlobal = {
      id: userId,
      email,
      name,
      role,
      empresaId: empresaId || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      ativo: true,
    };

    await setDoc(usuarioRef, usuarioData);
    console.log(`[usuarioService] Usuário global criado: ${email} (role: ${role})`);
  } catch (error) {
    console.error('[usuarioService] Erro ao criar usuário global:', error);
    throw error;
  }
}

/**
 * Busca usuário global por ID
 */
export async function obterUsuarioGlobal(userId: string): Promise<UsuarioGlobal | null> {
  try {
    const usuarioRef = doc(db, 'usuarios', userId);
    const snapshot = await getDoc(usuarioRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as UsuarioGlobal;
  } catch (error) {
    console.error('[usuarioService] Erro ao buscar usuário:', error);
    throw error;
  }
}

/**
 * Busca usuário por email (para verificação de login)
 */
export async function obterUsuarioPorEmail(email: string): Promise<UsuarioGlobal | null> {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Pega o primeiro resultado (email é único no Firebase Auth)
    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as UsuarioGlobal;
  } catch (error) {
    console.error('[usuarioService] Erro ao buscar usuário por email:', error);
    throw error;
  }
}

/**
 * Atualiza usuário global
 */
export async function atualizarUsuarioGlobal(
  userId: string,
  dados: Partial<UsuarioGlobal>
): Promise<void> {
  try {
    const usuarioRef = doc(db, 'usuarios', userId);
    const dataAtualizada = {
      ...dados,
      updatedAt: new Date(),
    };

    // Remove campos que não devem ser atualizados
    delete (dataAtualizada as any).id;
    delete (dataAtualizada as any).createdAt;

    await updateDoc(usuarioRef, dataAtualizada);
    console.log(`[usuarioService] Usuário atualizado: ${userId}`);
  } catch (error) {
    console.error('[usuarioService] Erro ao atualizar usuário:', error);
    throw error;
  }
}

/**
 * Lista todos os usuários (admin)
 */
export async function listarTodosUsuarios(): Promise<UsuarioGlobal[]> {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const snapshot = await getDocs(usuariosRef);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as UsuarioGlobal;
    });
  } catch (error) {
    console.error('[usuarioService] Erro ao listar usuários:', error);
    throw error;
  }
}

/**
 * Desativa usuário (bloqueia conta)
 */
export async function desativarUsuario(userId: string): Promise<void> {
  try {
    const usuarioRef = doc(db, 'usuarios', userId);
    await updateDoc(usuarioRef, {
      ativo: false,
      updatedAt: new Date(),
    });
    console.log(`[usuarioService] Usuário desativado: ${userId}`);
  } catch (error) {
    console.error('[usuarioService] Erro ao desativar usuário:', error);
    throw error;
  }
}

/**
 * Ativa usuário (desbloqueia conta)
 */
export async function ativarUsuario(userId: string): Promise<void> {
  try {
    const usuarioRef = doc(db, 'usuarios', userId);
    await updateDoc(usuarioRef, {
      ativo: true,
      updatedAt: new Date(),
    });
    console.log(`[usuarioService] Usuário ativado: ${userId}`);
  } catch (error) {
    console.error('[usuarioService] Erro ao ativar usuário:', error);
    throw error;
  }
}

/**
 * Deleta usuário (permanente)
 */
export async function deletarUsuario(userId: string): Promise<void> {
  try {
    const usuarioRef = doc(db, 'usuarios', userId);
    await updateDoc(usuarioRef, {
      ativo: false, // Soft delete através de flag
      updatedAt: new Date(),
    });
    console.log(`[usuarioService] Usuário deletado: ${userId}`);
  } catch (error) {
    console.error('[usuarioService] Erro ao deletar usuário:', error);
    throw error;
  }
}
