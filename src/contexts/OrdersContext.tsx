import React, { createContext, useContext, useState } from "react";
import { ServiceOrder, OrderStatus } from "../types";
import { useCompany } from "./CompanyContext";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { formatCurrencyBRL } from "../utils/formatters";

interface OrdersContextType {
  orders: ServiceOrder[];
  isLoadingOrders: boolean;
  ordersError: string | null;
  loadOrders: (status?: OrderStatus) => Promise<void>;
  addOrder: (
    order: Omit<ServiceOrder, "orderId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateOrder: (
    orderId: string,
    updates: Partial<ServiceOrder>,
  ) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  clearOrdersError: () => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadOrders = async (status?: OrderStatus) => {
    if (!company?.companyId) return;

    try {
      setIsLoadingOrders(true);
      setOrdersError(null);

      let q;
      if (status) {
        q = query(
          collection(db, "orders"),
          where("companyId", "==", company.companyId),
          where("status", "==", status),
        );
      } else {
        q = query(
          collection(db, "orders"),
          where("companyId", "==", company.companyId),
        );
      }

      const querySnapshot = await getDocs(q);
      const ordersList: ServiceOrder[] = [];

      querySnapshot.forEach((doc) => {
        ordersList.push({
          ...doc.data(),
          orderId: doc.id,
        } as ServiceOrder);
      });

      setOrders(ordersList);
    } catch (error) {
      console.error("[OrdersContext] Erro ao carregar ordens:", error);
      setOrdersError("Erro ao carregar ordens de serviço");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const addOrder = async (
    order: Omit<ServiceOrder, "orderId" | "createdAt" | "updatedAt">,
  ) => {
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    const roundCurrency = (value: number) =>
      Math.round((value + Number.EPSILON) * 100) / 100;

    try {
      const clientRef = doc(
        db,
        "empresas",
        company.companyId,
        "clientes",
        order.clientId,
      );
      const clientSnap = await getDoc(clientRef);

      if (!clientSnap.exists()) {
        throw new Error("Cliente não encontrado para esta ordem");
      }

      const cliente = clientSnap.data() as {
        status?: "ativo" | "bloqueado" | "inativo";
        descontoPercentual?: number;
        limiteCredito?: number;
        nome?: string;
      };

      if (cliente.status === "bloqueado") {
        throw new Error("Cliente bloqueado. Não é possível criar pedidos.");
      }

      if (cliente.status === "inativo") {
        throw new Error("Cliente arquivado. Reative antes de vender.");
      }

      const descontoPercentual = Math.max(
        0,
        Math.min(100, cliente.descontoPercentual ?? 0),
      );
      const originalTotalValue = roundCurrency(order.totalValue || 0);
      const discountedTotalValue = roundCurrency(
        originalTotalValue * (1 - descontoPercentual / 100),
      );

      const limiteCredito = cliente.limiteCredito ?? 0;
      if (limiteCredito > 0) {
        const faturasAbertasQuery = query(
          collection(db, "invoices"),
          where("companyId", "==", company.companyId),
          where("clientId", "==", order.clientId),
          where("status", "in", ["enviada", "atrasada"]),
        );

        const faturasAbertasSnap = await getDocs(faturasAbertasQuery);
        const emAberto = faturasAbertasSnap.docs.reduce((sum, invoiceDoc) => {
          const invoiceData = invoiceDoc.data() as { totalValue?: number };
          return sum + (invoiceData.totalValue || 0);
        }, 0);

        const projectedExposure = roundCurrency(
          emAberto + discountedTotalValue,
        );
        if (projectedExposure > limiteCredito) {
          const available = roundCurrency(limiteCredito - emAberto);
          throw new Error(
            `Limite de crédito excedido. Disponível: ${formatCurrencyBRL(
              Math.max(0, available),
            )}`,
          );
        }
      }

      const orderPayload: Omit<
        ServiceOrder,
        "orderId" | "createdAt" | "updatedAt"
      > = {
        ...order,
        clientName: order.clientName || cliente.nome || order.clientName,
        originalTotalValue,
        discountPercentApplied: descontoPercentual,
        totalValue: discountedTotalValue,
      };

      const docRef = await addDoc(collection(db, "orders"), {
        ...orderPayload,
        companyId: company.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) => [
        ...prev,
        {
          ...orderPayload,
          orderId: docRef.id,
          companyId: company.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("[OrdersContext] Erro ao adicionar ordem:", error);
      throw error;
    }
  };

  const updateOrder = async (
    orderId: string,
    updates: Partial<ServiceOrder>,
  ) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, ...updates, updatedAt: new Date() }
            : o,
        ),
      );
    } catch (error) {
      console.error("[OrdersContext] Erro ao atualizar ordem:", error);
      throw error;
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    } catch (error) {
      console.error("[OrdersContext] Erro ao deletar ordem:", error);
      throw error;
    }
  };

  const clearOrdersError = () => setOrdersError(null);

  return (
    <OrdersContext.Provider
      value={{
        orders,
        isLoadingOrders,
        ordersError,
        loadOrders,
        addOrder,
        updateOrder,
        deleteOrder,
        clearOrdersError,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextType {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders deve ser usado dentro de OrdersProvider");
  }
  return context;
}
