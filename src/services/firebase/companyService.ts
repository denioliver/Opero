import {
  collection,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
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
    const userDocRef = doc(db, 'usuarios', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) return false;

    const userData = userSnap.data();
    return !!userData.empresaId;
  } catch (error) {
    console.error('Erro ao verificar empresa do usuário:', error);
    return false;
  }
}

/**
 * Cria uma nova empresa e inicializa sua estrutura
 * @param companyData - Dados da empresa
 * @param userId - ID do usuário criador (será admin)
 * @returns ID da empresa criada
 */
export async function createCompany(
  companyData: Omit<Company, 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  try {
    console.log('[companyService] Iniciando createCompany para:', userId);
    
    // Verifica se usuário já tem empresa
    const hasCompany = await checkUserHasCompany(userId);
    console.log('[companyService] Usuário já tem empresa?', hasCompany);
    
    if (hasCompany) {
      throw new Error(
        'Você já possui uma empresa cadastrada. Para criar outra, entre em contato com o suporte.'
      );
    }

    // Usa batch para transação atômica
    const batch = writeBatch(db);

    // Gera ID único para a empresa
    const empresaRef = doc(collection(db, 'empresas'));
    const empresaId = empresaRef.id;
    console.log('[companyService] Novo empresaId gerado:', empresaId);

    // Prepara dados da empresa
    const empresaDoc = {
      ...companyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId,
      status: 'active',
    };

    // Define documento da empresa
    batch.set(empresaRef, empresaDoc);
    console.log('[companyService] Documento de empresa preparado');

    // Cria as subcoleções vazias inicializando com documento placeholder
    await initializeCompanyStructure(batch, empresaId);
    console.log('[companyService] Estrutura de subcoleções inicializada');

    // Registra usuário como admin da empresa
    const usuarioEmpresaRef = doc(collection(empresaRef, 'usuarios'));
    const usuarioDoc: Omit<UsuarioEmpresa, 'createdAt'> & { createdAt: any } = {
      id: usuarioEmpresaRef.id,
      empresaId,
      firebaseUid: userId,
      email: companyData.email || '',
      nome: companyData.name || '',
      role: 'admin',
      createdAt: serverTimestamp(),
      createdBy: userId,
      ativo: true,
      status: 'active',
    };
    batch.set(usuarioEmpresaRef, usuarioDoc);
    console.log('[companyService] Usuário admin preparado');

    // Atualiza documento do usuário com empresaId
    const userDocRef = doc(db, 'usuarios', userId);
    batch.update(userDocRef, { empresaId });
    console.log('[companyService] Documento do usuário preparado para atualização');

    // Executa batch
    await batch.commit();
    console.log('[companyService] Batch executado com sucesso');

    return empresaId;
  } catch (error) {
    console.error('[companyService] Erro ao criar empresa:', error);
    throw error;
  }
}

/**
 * Inicializa a estrutura de subcoleções da empresa
 * @param batch - WriteBatch para operações
 * @param empresaId - ID da empresa
 */
async function initializeCompanyStructure(batch: any, empresaId: string): Promise<void> {
  const empresaRef = doc(db, 'empresas', empresaId);

  // Lista de coleções que devem ser criadas
  const collections = [
    'clientes',
    'produtos',
    'ordens_servico',
    'ordem_itens',
    'notas_fiscais',
    'financeiro',
    'notificacoes',
    'logs_auditoria',
    'usuarios',
  ];

  // Cria placeholder para cada coleção
  for (const colName of collections) {
    if (colName !== 'usuarios') {
      // usuarios é criado no createCompany
      const placeholderRef = doc(collection(empresaRef, colName));
      batch.set(placeholderRef, {
        _placeholder: true,
        createdAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Obtém dados de uma empresa
 * @param empresaId - ID da empresa
 * @returns Dados da empresa ou null
 */
export async function getCompany(empresaId: string): Promise<Company | null> {
  try {
    const docRef = doc(db, 'empresas', empresaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      companyId: docSnap.id,
      ...docSnap.data(),
    } as Company;
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return null;
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

    return userSnap.data().empresaId || null;
  } catch (error) {
    console.error('Erro ao buscar empresaId do usuário:', error);
    return null;
  }
}
