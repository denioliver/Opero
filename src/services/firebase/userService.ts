/**
 * User Service - Operações relacionadas a usuários
 * Gerencia dados de usuários, roles e permissões
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UsuarioPerfil } from '../../domains/usuarios/types';

/**
 * Obtém perfil do usuário pelo Firebase UID
 */
export async function getUserProfile(userId: string): Promise<UsuarioPerfil | null> {
  try {
    const userRef = doc(db, 'usuarios', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return userSnap.data() as UsuarioPerfil;
  } catch (error) {
    console.error('[getUserProfile] Erro:', error);
    return null;
  }
}

/**
 * Cria ou atualiza perfil do usuário
 */
export async function createOrUpdateUserProfile(
  userId: string,
  data: Partial<UsuarioPerfil>
): Promise<void> {
  try {
    const userRef = doc(db, 'usuarios', userId);
    const profile: UsuarioPerfil = {
      id: userId,
      email: data.email || '',
      nome: data.nome || 'Usuário',
      createdAt: new Date(),
      ...data,
    };

    await setDoc(userRef, profile, { merge: true });
    console.log('[createOrUpdateUserProfile] Usuário atualizado:', userId);
  } catch (error) {
    console.error('[createOrUpdateUserProfile] Erro:', error);
    throw error;
  }
}

/**
 * Atualiza empresa do usuário
 */
export async function updateUserEmpresa(
  userId: string,
  empresaId: string
): Promise<void> {
  try {
    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, {
      empresaId,
      updatedAt: serverTimestamp(),
    });
    console.log('[updateUserEmpresa] Usuário vinculado à empresa:', empresaId);
  } catch (error) {
    console.error('[updateUserEmpresa] Erro:', error);
    throw error;
  }
}
