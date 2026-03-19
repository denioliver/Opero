/**
 * Serviço de Auditoria
 * Registra todas as ações de funcionários na empresa
 */

import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuditoriaLog, FuncionarioContexto } from '../../domains/auth/types';

/**
 * Registra uma ação de auditoria
 */
export async function registrarAuditoria(
  empresaId: string,
  funcionario: FuncionarioContexto,
  acao: string,
  colecao: string,
  documentoId: string,
  dados: Record<string, any>,
  mudancas?: Record<string, any>
): Promise<string> {
  try {
    const auditoriaRef = collection(db, 'empresas', empresaId, 'auditoria');

    const logData: Omit<AuditoriaLog, 'id'> = {
      empresaId,
      funcionarioId: funcionario.funcionarioId,
      funcionarioNome: funcionario.funcionarioNome,
      qualificacao: funcionario.qualificacao,
      acao,
      colecao,
      documentoId,
      dados,
      ...(mudancas !== undefined ? { mudancas } : {}),
      criadoEm: new Date(),
    };

    // Firestore não aceita valores `undefined` em nenhuma profundidade.
    // Mantemos uma sanitização rasa aqui para evitar erros acidentais.
    Object.keys(logData as any).forEach((key) => {
      if ((logData as any)[key] === undefined) {
        delete (logData as any)[key];
      }
    });

    const docRef = await addDoc(auditoriaRef, logData);
    console.log(
      `[auditoriaService] Auditoria registrada: ${acao} por ${funcionario.funcionarioNome}`
    );

    return docRef.id;
  } catch (error) {
    console.error('[auditoriaService] Erro ao registrar auditoria:', error);
    throw error;
  }
}

/**
 * Lista auditoria de uma empresa (filtrada opcionalmente)
 */
export async function listarAuditoria(
  empresaId: string,
  filtros?: {
    funcionarioId?: string;
    acao?: string;
    colecao?: string;
    dataInicio?: Date;
    dataFim?: Date;
  }
): Promise<AuditoriaLog[]> {
  try {
    let constraints = [where('empresaId', '==', empresaId)];

    if (filtros?.funcionarioId) {
      constraints.push(where('funcionarioId', '==', filtros.funcionarioId));
    }

    if (filtros?.acao) {
      constraints.push(where('acao', '==', filtros.acao));
    }

    if (filtros?.colecao) {
      constraints.push(where('colecao', '==', filtros.colecao));
    }

    const auditoriaRef = collection(db, 'empresas', empresaId, 'auditoria');
    const q = query(auditoriaRef, ...constraints);
    const snapshot = await getDocs(q);

    let logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        criadoEm: data.criadoEm?.toDate?.() || new Date(),
      } as AuditoriaLog;
    });

    // Filtros por data (feito em memória pois Firestore tem limitações)
    if (filtros?.dataInicio) {
      logs = logs.filter((log) => log.criadoEm >= filtros.dataInicio!);
    }

    if (filtros?.dataFim) {
      logs = logs.filter((log) => log.criadoEm <= filtros.dataFim!);
    }

    // Ordena por data decrescente
    logs.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

    return logs;
  } catch (error) {
    console.error('[auditoriaService] Erro ao listar auditoria:', error);
    throw error;
  }
}

/**
 * Obter auditoria por documento
 */
export async function obterAuditoriaDocumento(
  empresaId: string,
  colecao: string,
  documentoId: string
): Promise<AuditoriaLog[]> {
  try {
    const auditoriaRef = collection(db, 'empresas', empresaId, 'auditoria');
    const q = query(
      auditoriaRef,
      where('colecao', '==', colecao),
      where('documentoId', '==', documentoId)
    );
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        criadoEm: data.criadoEm?.toDate?.() || new Date(),
      } as AuditoriaLog;
    });

    // Ordena por data crescente (mais antigos primeiro)
    logs.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());

    return logs;
  } catch (error) {
    console.error('[auditoriaService] Erro ao obter auditoria do documento:', error);
    throw error;
  }
}

/**
 * Obter auditoria por funcionário
 */
export async function obterAuditoriaFuncionario(
  empresaId: string,
  funcionarioId: string
): Promise<AuditoriaLog[]> {
  try {
    const auditoriaRef = collection(db, 'empresas', empresaId, 'auditoria');
    const q = query(auditoriaRef, where('funcionarioId', '==', funcionarioId));
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        criadoEm: data.criadoEm?.toDate?.() || new Date(),
      } as AuditoriaLog;
    });

    // Ordena por data decrescente
    logs.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

    return logs;
  } catch (error) {
    console.error('[auditoriaService] Erro ao obter auditoria do funcionário:', error);
    throw error;
  }
}

/**
 * Obtém resumo de atividades por dia
 */
export async function obterResumoAtividades(
  empresaId: string,
  diasAnteriores: number = 30
): Promise<Map<string, number>> {
  try {
    const auditoriaRef = collection(db, 'empresas', empresaId, 'auditoria');
    const snapshot = await getDocs(auditoriaRef);

    const resumo = new Map<string, number>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const dataLog = data.criadoEm?.toDate?.() || new Date();
      const dias = Math.floor((hoje.getTime() - dataLog.getTime()) / (1000 * 60 * 60 * 24));

      if (dias <= diasAnteriores) {
        const dataStr = dataLog.toISOString().split('T')[0];
        resumo.set(dataStr, (resumo.get(dataStr) || 0) + 1);
      }
    });

    return resumo;
  } catch (error) {
    console.error('[auditoriaService] Erro ao obter resumo de atividades:', error);
    throw error;
  }
}
