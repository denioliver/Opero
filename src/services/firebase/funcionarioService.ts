/**
 * Serviço de Funcionários
 * Gerencia funcionários dentro de uma empresa
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
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Funcionario, FuncionarioQualificacao } from '../../domains/auth/types';
import bcrypt from 'bcryptjs';

/**
 * Cria um funcionário na empresa
 */
export async function criarFuncionario(
  empresaId: string,
  nome: string,
  senha: string,
  qualificacao: FuncionarioQualificacao,
  email?: string,
  telefone?: string
): Promise<string> {
  try {
    // Valida se funcionário com este nome já existe na empresa
    const jaExiste = await funcionarioExistePorNome(empresaId, nome);
    if (jaExiste) {
      throw new Error(`Funcionário com nome "${nome}" já existe nesta empresa`);
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const funcionariosRef = collection(db, 'empresas', empresaId, 'funcionarios');
    const novoFuncionarioRef = doc(funcionariosRef);

    const funcionarioData: Funcionario = {
      id: novoFuncionarioRef.id,
      empresaId,
      nome,
      senha: senhaHash,
      qualificacao,
      email: email || undefined,
      telefone: telefone || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      ativo: true,
    };

    await setDoc(novoFuncionarioRef, funcionarioData);
    console.log(
      `[funcionarioService] Funcionário criado: ${nome} em empresa ${empresaId}`
    );

    return novoFuncionarioRef.id;
  } catch (error) {
    console.error('[funcionarioService] Erro ao criar funcionário:', error);
    throw error;
  }
}

/**
 * Busca funcionário por ID
 */
export async function obterFuncionario(
  empresaId: string,
  funcionarioId: string
): Promise<Funcionario | null> {
  try {
    const funcionarioRef = doc(
      db,
      'empresas',
      empresaId,
      'funcionarios',
      funcionarioId
    );
    const snapshot = await getDoc(funcionarioRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Funcionario;
  } catch (error) {
    console.error('[funcionarioService] Erro ao buscar funcionário:', error);
    throw error;
  }
}

/**
 * Lista todos os funcionários de uma empresa
 */
export async function listarFuncionarios(empresaId: string): Promise<Funcionario[]> {
  try {
    const funcionariosRef = collection(db, 'empresas', empresaId, 'funcionarios');
    const q = query(funcionariosRef, where('ativo', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as Funcionario;
    });
  } catch (error) {
    console.error('[funcionarioService] Erro ao listar funcionários:', error);
    throw error;
  }
}

/**
 * Verifica se funcionário existe por nome
 */
export async function funcionarioExistePorNome(
  empresaId: string,
  nome: string
): Promise<boolean> {
  try {
    const funcionariosRef = collection(db, 'empresas', empresaId, 'funcionarios');
    const q = query(
      funcionariosRef,
      where('nome', '==', nome),
      where('ativo', '==', true)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[funcionarioService] Erro ao verificar existência:', error);
    throw error;
  }
}

/**
 * Autentica funcionário com nome e senha
 * Retorna o funcionário se credenciais forem válidas, null caso contrário
 */
export async function autenticarFuncionario(
  empresaId: string,
  nome: string,
  senhaPlain: string
): Promise<Funcionario | null> {
  try {
    const funcionariosRef = collection(db, 'empresas', empresaId, 'funcionarios');
    const q = query(
      funcionariosRef,
      where('nome', '==', nome),
      where('ativo', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[funcionarioService] Funcionário não encontrado:', nome);
      return null;
    }

    const doc = snapshot.docs[0];
    const funcionario = {
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    } as Funcionario;

    // Verifica senha
    const senhaValida = await bcrypt.compare(senhaPlain, funcionario.senha);

    if (!senhaValida) {
      console.log('[funcionarioService] Senha inválida para:', nome);
      return null;
    }

    console.log('[funcionarioService] Funcionário autenticado:', nome);
    return funcionario;
  } catch (error) {
    console.error('[funcionarioService] Erro ao autenticar funcionário:', error);
    throw error;
  }
}

/**
 * Atualiza funcionário
 */
export async function atualizarFuncionario(
  empresaId: string,
  funcionarioId: string,
  dados: Partial<Funcionario>
): Promise<void> {
  try {
    const funcionarioRef = doc(
      db,
      'empresas',
      empresaId,
      'funcionarios',
      funcionarioId
    );

    const dataAtualizada = {
      ...dados,
      updatedAt: new Date(),
    };

    // Remove campos que não devem ser atualizados
    delete (dataAtualizada as any).id;
    delete (dataAtualizada as any).empresaId;
    delete (dataAtualizada as any).createdAt;

    // Se atualizando senha, faz hash
    if (dataAtualizada.senha) {
      dataAtualizada.senha = await bcrypt.hash(dataAtualizada.senha, 10);
    }

    await updateDoc(funcionarioRef, dataAtualizada);
    console.log(`[funcionarioService] Funcionário atualizado: ${funcionarioId}`);
  } catch (error) {
    console.error('[funcionarioService] Erro ao atualizar funcionário:', error);
    throw error;
  }
}

/**
 * Desativa funcionário
 */
export async function desativarFuncionario(
  empresaId: string,
  funcionarioId: string
): Promise<void> {
  try {
    const funcionarioRef = doc(
      db,
      'empresas',
      empresaId,
      'funcionarios',
      funcionarioId
    );
    await updateDoc(funcionarioRef, {
      ativo: false,
      updatedAt: new Date(),
    });
    console.log(`[funcionarioService] Funcionário desativado: ${funcionarioId}`);
  } catch (error) {
    console.error('[funcionarioService] Erro ao desativar funcionário:', error);
    throw error;
  }
}

/**
 * Deleta funcionário
 */
export async function deletarFuncionario(
  empresaId: string,
  funcionarioId: string
): Promise<void> {
  try {
    const funcionarioRef = doc(
      db,
      'empresas',
      empresaId,
      'funcionarios',
      funcionarioId
    );
    await deleteDoc(funcionarioRef);
    console.log(`[funcionarioService] Funcionário deletado: ${funcionarioId}`);
  } catch (error) {
    console.error('[funcionarioService] Erro ao deletar funcionário:', error);
    throw error;
  }
}
