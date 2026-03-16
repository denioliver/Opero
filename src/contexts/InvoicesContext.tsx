import React, { createContext, useContext, useState } from "react";
import { Invoice, InvoiceStatus } from "../types";
import { useCompany } from "./CompanyContext";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

interface InvoicesContextType {
  invoices: Invoice[];
  isLoadingInvoices: boolean;
  invoicesError: string | null;
  loadInvoices: (status?: InvoiceStatus) => Promise<void>;
  addInvoice: (
    invoice: Omit<Invoice, "invoiceId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateInvoice: (
    invoiceId: string,
    updates: Partial<Invoice>,
  ) => Promise<void>;
  deleteInvoice: (invoiceId: string) => Promise<void>;
  clearInvoicesError: () => void;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(
  undefined,
);

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const loadInvoices = async (status?: InvoiceStatus) => {
    if (!company?.companyId) return;

    try {
      setIsLoadingInvoices(true);
      setInvoicesError(null);

      let q;
      if (status) {
        q = query(
          collection(db, "invoices"),
          where("companyId", "==", company.companyId),
          where("status", "==", status),
        );
      } else {
        q = query(
          collection(db, "invoices"),
          where("companyId", "==", company.companyId),
        );
      }

      const querySnapshot = await getDocs(q);
      const invoicesList: Invoice[] = [];

      querySnapshot.forEach((doc) => {
        invoicesList.push({
          ...doc.data(),
          invoiceId: doc.id,
        } as Invoice);
      });

      setInvoices(invoicesList);
    } catch (error) {
      console.error("[InvoicesContext] Erro ao carregar notas fiscais:", error);
      setInvoicesError("Erro ao carregar notas fiscais");
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const addInvoice = async (
    invoice: Omit<Invoice, "invoiceId" | "createdAt" | "updatedAt">,
  ) => {
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    try {
      const docRef = await addDoc(collection(db, "invoices"), {
        ...invoice,
        companyId: company.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setInvoices((prev) => [
        ...prev,
        {
          ...invoice,
          invoiceId: docRef.id,
          companyId: company.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("[InvoicesContext] Erro ao adicionar nota fiscal:", error);
      throw error;
    }
  };

  const updateInvoice = async (
    invoiceId: string,
    updates: Partial<Invoice>,
  ) => {
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      setInvoices((prev) =>
        prev.map((i) =>
          i.invoiceId === invoiceId
            ? { ...i, ...updates, updatedAt: new Date() }
            : i,
        ),
      );
    } catch (error) {
      console.error("[InvoicesContext] Erro ao atualizar nota fiscal:", error);
      throw error;
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      setInvoices((prev) => prev.filter((i) => i.invoiceId !== invoiceId));
    } catch (error) {
      console.error("[InvoicesContext] Erro ao deletar nota fiscal:", error);
      throw error;
    }
  };

  const clearInvoicesError = () => setInvoicesError(null);

  return (
    <InvoicesContext.Provider
      value={{
        invoices,
        isLoadingInvoices,
        invoicesError,
        loadInvoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        clearInvoicesError,
      }}
    >
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices(): InvoicesContextType {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error("useInvoices deve ser usado dentro de InvoicesProvider");
  }
  return context;
}
