import {
  collection,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Company } from '../../types';
import { UsuarioEmpresa } from '../../domains/usuarios/types';

/**
 * Verifica se um usuário já possui uma empresa cadastrada
 * @param userId - ID do usuário Firebase
 * @returns true se usuário tem empresa, false caso contrário
 */
export async function checkUserHasCompany(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'usuarios', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();
    return !!userData?.empresaId;
  } catch (error) {
    console.error('[checkUserHasCompany] Erro:', error);
    return false;
  }
}

/**
 * Obtém empresa do usuário logado
 * @param userId - ID do usuário Firebase
 * @returns ID da empresa ou null
 */
export async function getUserCompanyId(userId: string): Promise<string | null> {
  try {
    const userRef = doc(db, 'usuarios', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return userSnap.data()?.empresaId || null;
  } catch (error) {
    console.error('[getUserCompanyId] Erro:', error);
    return null;
  }
}

/**
 * Obtém dados de uma empresa
 * @param empresaId - ID da empresa (companyId)
 * @returns Dados da empresa ou null
 */
export async function getCompany(empresaId: string): Promise<Company | null> {
  try {
    const empresaRef = doc(db, 'empresas', empresaId);
    const empresaSnap = await getDoc(empresaRef);

    if (!empresaSnap.exists()) {
      return null;
    }

    return {
      companyId: empresaSnap.id,
      ...empresaSnap.data(),
    } as Company;
  } catch (error) {
    console.error('[getCompany] Erro:', error);
    return null;
  }
}

/**
 * Cria uma nova empresa para o usuário
 * 1. Valida se usuário já tem empresa
 * 2. Gera ID único para a empresa
 * 3. Cria documento em /empresas/{id}
 * 4. Registra usuário como admin
 * 5. Atualiza /usuarios/{uid} com empresaId
 *
 * @param companyData - Dados da empresa (sem companyId, userId, createdAt)
 * @param userId - ID do usuário criador (Firebase UID)
 * @returns ID da empresa criada
 * @throws Error se usuário já tem empresa ou dados inválidos
 */
export async function createCompany(
  companyData: Omit<Company, 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  try {
    console.log('[createCompany] Iniciando criação de empresa para userId:', userId);

    // 1. Valida se usuário já tem empresa
    const hasCompany = await checkUserHasCompany(userId);
    if (hasCompany) {
      const errorMsg =
        'Você já possui uma empresa cadastrada. Para criar outra, entre em contato com o suporte.';
      console.error('[createCompany]', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[createCompany] Usuário não possui empresa, prosseguindo...');

    // Usa batch para transação atômica
    const batch = writeBatch(db);

    // 2. Gera ID único para a empresa
    const empresasRef = collection(db, 'empresas');
    const novaEmpresaRef = doc(empresasRef);
    const empresaId = novaEmpresaRef.id;

    console.log('[createCompany] ID da empresa gerado:', empresaId);

    // 3. Prepara dados da empresa
    const empresaData: Company = {
      companyId: empresaId,
      userId,
      ...companyData,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    console.log('[createCompany] Salvando empresa no Firestore...');
    batch.set(novaEmpresaRef, empresaData);

    // 4. Atualiza documento do usuário com referência à empresa
    const userDocRef = doc(db, 'usuarios', userId);
    console.log('[createCompany] Atualizando usuário com empresaId...');
    batch.update(userDocRef, {
      empresaId: empresaId,
      updatedAt: serverTimestamp(),
    });

    // 5. Registra usuário como admin da empresa em subcoleção
    const usuarioEmpresaRef = doc(db, 'empresas', empresaId, 'usuarios', userId);
    const usuarioEmpresa: UsuarioEmpresa = {
      id: userId,
      empresaId,
      firebaseUid: userId,
      email: companyData.email || '',
      nome: companyData.name || 'Admin',
      role: 'admin',
      createdAt: serverTimestamp() as Timestamp,
      createdBy: userId,
      ativo: true,
      status: 'active',
    };
    console.log('[createCompany] Adicionando usuário como admin...');
    batch.set(usuarioEmpresaRef, usuarioEmpresa);

    // Executa batch
    console.log('[createCompany] Executando batch transaction...');
    await batch.commit();
    console.log('[createCompany] Empresa criada com sucesso! ID:', empresaId);

    return empresaId;
  } catch (error) {
    console.error('[createCompany] Erro ao criar empresa:', error);
    throw error;
  }
}

/**
 * Atualiza dados de uma empresa
 * @param empresaId - ID da empresa
 * @param updates - Campos a atualizar
 * @param userId - ID do usuário (para validação)
 */
export async function updateCompany(
  empresaId: string,
  updates: Partial<Company>,
  userId: string
): Promise<void> {
  try {
    const empresa = await getCompany(empresaId);
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    if (empresa.userId !== userId) {
      throw new Error('Você não tem permissão para atualizar esta empresa');
    }

    const empresaRef = doc(db, 'empresas', empresaId);
    await updateDoc(empresaRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    console.log('[updateCompany] Empresa atualizada:', empresaId);
  } catch (error) {
    console.error('[updateCompany] Erro:', error);
    throw error;
  }
}
