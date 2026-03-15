/**
 * Utilitários para operações com Firestore
 */

import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Query,
  DocumentData,
  writeBatch,
} from 'firebase/firestore';

/**
 * Gera o próximo número sequencial para uma coleção
 * Ex: "OS-2026-0001", "NF-2026-0001"
 */
export async function generateSequentialNumber(
  companyId: string,
  prefix: string,
  counterCollection: string
): Promise<string> {
  const counterDocRef = doc(db, counterCollection, companyId);

  try {
    const batch = writeBatch(db);

    // Incrementar counter
    batch.set(
      counterDocRef,
      {
        [prefix]: (await getDoc(counterDocRef)).get(prefix) || 0 + 1,
      },
      { merge: true }
    );

    await batch.commit();

    const counterDoc = await getDoc(counterDocRef);
    const counter = counterDoc.get(prefix) || 1;

    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
  } catch (error) {
    console.error('Erro ao gerar número sequencial:', error);
    throw error;
  }
}

/**
 * Adiciona um documento com ID gerado automaticamente
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  try {
    const newDocRef = doc(collection(db, collectionName));
    await setDoc(newDocRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return newDocRef.id;
  } catch (error) {
    console.error(`Erro ao adicionar documento em ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Atualiza um documento existente
 */
export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Erro ao atualizar documento em ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Deleta um documento
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Erro ao deletar documento em ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Obtém um documento por ID
 */
export async function getDocumentById<T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        [docId]: docId,
      } as T;
    }
    return null;
  } catch (error) {
    console.error(`Erro ao obter documento em ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Busca documentos com filtros e ordenação
 */
export async function queryDocuments<T extends DocumentData>(
  collectionName: string,
  filters?: Array<{ field: string; operator: any; value: any }>,
  orderByField?: string,
  orderByDirection?: 'asc' | 'desc',
  limitCount?: number
): Promise<(T & { id: string })[]> {
  try {
    let q: Query;
    const constraints = [];

    // Adicionar filtros
    if (filters) {
      filters.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value));
      });
    }

    // Adicionar ordenação
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderByDirection || 'asc'));
    }

    // Adicionar limite
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    q = query(collection(db, collectionName), ...constraints);

    const querySnapshot = await getDocs(q);
    const documents: (T & { id: string })[] = [];

    querySnapshot.forEach((doc) => {
      documents.push({
        ...doc.data(),
        id: doc.id,
      } as T & { id: string });
    });

    return documents;
  } catch (error) {
    console.error(`Erro ao consultar ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Busca um documento com filtro único
 */
export async function findDocument<T extends DocumentData>(
  collectionName: string,
  field: string,
  value: any
): Promise<(T & { id: string }) | null> {
  try {
    const q = query(collection(db, collectionName), where(field, '==', value));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      ...doc.data(),
      id: doc.id,
    } as T & { id: string };
  } catch (error) {
    console.error(`Erro ao encontrar documento em ${collectionName}:`, error);
    throw error;
  }
}
