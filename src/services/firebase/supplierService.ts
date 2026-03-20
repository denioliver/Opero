import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { CompraFornecedor, Fornecedor } from "../../domains/fornecedores/types";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

const removeUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
};

export async function createSupplier(
  empresaId: string,
  supplierData: Omit<
    Fornecedor,
    "id" | "empresaId" | "createdAt" | "createdBy" | "updatedAt" | "status"
  >,
  userId: string,
): Promise<string> {
  const fornecedoresRef = collection(db, "empresas", empresaId, "fornecedores");
  const newSupplierRef = doc(fornecedoresRef);
  const fornecedorId = newSupplierRef.id;

  const fornecedor: Fornecedor = {
    id: fornecedorId,
    empresaId,
    ...supplierData,
    produtosFornecidos: supplierData.produtosFornecidos || [],
    historicoCompras: supplierData.historicoCompras || [],
    status: "ativo",
    createdBy: userId,
    createdAt: serverTimestamp() as Timestamp,
  };

  await setDoc(newSupplierRef, removeUndefinedDeep(fornecedor));
  return fornecedorId;
}

export async function getSuppliers(
  empresaId: string,
  statusFilter?: "ativo" | "bloqueado" | "inativo",
): Promise<Fornecedor[]> {
  const fornecedoresRef = collection(db, "empresas", empresaId, "fornecedores");
  const snapshot = await getDocs(fornecedoresRef);

  let fornecedores = snapshot.docs.map((item) => item.data() as Fornecedor);

  if (statusFilter) {
    fornecedores = fornecedores.filter((fornecedor) => fornecedor.status === statusFilter);
  }

  fornecedores.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  return fornecedores;
}

export async function getSupplier(
  empresaId: string,
  fornecedorId: string,
): Promise<Fornecedor | null> {
  const supplierRef = doc(db, "empresas", empresaId, "fornecedores", fornecedorId);
  const supplierSnap = await getDoc(supplierRef);

  if (!supplierSnap.exists()) return null;
  return supplierSnap.data() as Fornecedor;
}

export async function updateSupplier(
  empresaId: string,
  fornecedorId: string,
  updates: Partial<Omit<Fornecedor, "id" | "empresaId" | "createdAt" | "createdBy">>,
): Promise<void> {
  const supplierRef = doc(db, "empresas", empresaId, "fornecedores", fornecedorId);

  await updateDoc(
    supplierRef,
    removeUndefinedDeep({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
}

export async function deleteSupplier(
  empresaId: string,
  fornecedorId: string,
): Promise<void> {
  const supplierRef = doc(db, "empresas", empresaId, "fornecedores", fornecedorId);

  await updateDoc(supplierRef, {
    status: "inativo",
    updatedAt: serverTimestamp(),
  });
}

export async function checkSupplierDocumentExists(
  empresaId: string,
  cpfCnpj: string,
  excludeFornecedorId?: string,
): Promise<boolean> {
  const fornecedoresRef = collection(db, "empresas", empresaId, "fornecedores");
  const q = query(fornecedoresRef, where("cpfCnpj", "==", cpfCnpj));
  const snapshot = await getDocs(q);

  const ativos = snapshot.docs.filter((item) => item.data().status !== "inativo");

  if (ativos.length === 0) {
    return false;
  }

  if (excludeFornecedorId && ativos.length === 1) {
    return ativos[0].id !== excludeFornecedorId;
  }

  return ativos.length > 0;
}

export async function registerSupplierPurchase(
  empresaId: string,
  fornecedorId: string,
  compra: Omit<CompraFornecedor, "id">,
): Promise<void> {
  const supplierRef = doc(db, "empresas", empresaId, "fornecedores", fornecedorId);
  const supplierSnap = await getDoc(supplierRef);

  if (!supplierSnap.exists()) {
    throw new Error("Fornecedor não encontrado");
  }

  const fornecedor = supplierSnap.data() as Fornecedor;
  const historicoAtual = fornecedor.historicoCompras || [];

  const novaCompra: CompraFornecedor = {
    id: `${Date.now()}-${Math.random()}`,
    ...compra,
  };

  await updateDoc(supplierRef, {
    historicoCompras: [...historicoAtual, removeUndefinedDeep(novaCompra)],
    updatedAt: serverTimestamp(),
  });
}
