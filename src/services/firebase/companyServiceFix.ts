/**
 * Fix para companyService - Valida e cria empresa corretamente
 * Este arquivo substitui a lógica problemática do companyService original
 */

import {
  collection,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Company } from '../../types';
import { UsuarioEmpresa } from '../../domains/usuarios/types';

/**
 * VERSÃO CORRIGIDA: Cria empresa validando se usuário já possui uma
 */
export async function createCompanyFixed(
  companyData: Omit<Company, 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  try {
    console.log('[createCompanyFixed] Iniciando para userId:', userId);

    // 1. Verifica se usuário já tem empresa
    const userRef = doc(db, 'usuarios', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('Usuário não encontrado no sistema');
    }

    if (userSnap.data()?.empresaId) {
      throw new Error(
        'Você já possui uma empresa. Entre em contato com suporte para criar outra.'
      );
    }

    // 2. Usa batch para transação atômica
    const batch = writeBatch(db);

    // 3. Gera ID único
    const novaEmpresaRef = doc(collection(db, 'empresas'));
    const empresaId = novaEmpresaRef.id;

    console.log('[createCompanyFixed] Criando empresa:', empresaId);

    // 4. Documento da empresa
    const empresaData: Company = {
      companyId: empresaId,
      userId,
      ...companyData,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    batch.set(novaEmpresaRef, empresaData);

    // 5. Atualiza usuário
    batch.update(userRef, {
      empresaId,
      updatedAt: serverTimestamp(),
    });

    // 6. Adiciona usuário como admin na subcoleção
    const adminRef = doc(db, 'empresas', empresaId, 'usuarios', userId);
    const adminData: UsuarioEmpresa = {
      id: userId,
      empresaId,
      firebaseUid: userId,
      email: companyData.email,
      nome: companyData.name,
      role: 'admin',
      createdAt: serverTimestamp() as Timestamp,
      createdBy: userId,
      ativo: true,
      status: 'active',
    };

    batch.set(adminRef, adminData);

    // 7. Executa batch
    await batch.commit();

    console.log('[createCompanyFixed] Empresa criada com sucesso:', empresaId);
    return empresaId;
  } catch (error) {
    console.error('[createCompanyFixed] Erro:', error);
    throw error;
  }
}
