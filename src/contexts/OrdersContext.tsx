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
import { useAuth } from "./AuthContext";
import { useFuncionario } from "./FuncionarioContext";
import { registrarAuditoria } from "../services/firebase/auditoriaService";

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
  faturarOrder: (
    orderId: string,
    options?: {
      dueDate?: Date;
      parcelas?: number;
      formaPagamento?: string;
    },
  ) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  clearOrdersError: () => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
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
        await addDoc(collection(db, "alertas_sistema"), {
          companyId: company.companyId,
          tipo: "cliente_bloqueado",
          titulo: "Cliente bloqueado tentando comprar",
          descricao: `${cliente.nome || order.clientName || order.clientId} tentou gerar pedido bloqueado`,
          origemId: order.clientId,
          lido: false,
          createdAt: serverTimestamp(),
        });
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
        subtotal: originalTotalValue,
        discount: roundCurrency(originalTotalValue - discountedTotalValue),
        total: discountedTotalValue,
        status: order.status || "aberto",
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

      if (company.companyId && user?.id) {
        const actor = funcionario
          ? {
              funcionarioId: funcionario.funcionarioId,
              funcionarioNome: funcionario.funcionarioNome,
              qualificacao: funcionario.qualificacao,
              empresaId: company.companyId,
            }
          : {
              funcionarioId: user.id,
              funcionarioNome: user.name || user.email,
              qualificacao: "outro" as any,
              empresaId: company.companyId,
            };

        await registrarAuditoria(
          company.companyId,
          actor,
          "criar_pedido",
          "ordens",
          docRef.id,
          {
            clienteId: order.clientId,
            total: discountedTotalValue,
            itens: order.items.length,
          },
        );
      }
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

      if (company?.companyId && user?.id) {
        const actor = funcionario
          ? {
              funcionarioId: funcionario.funcionarioId,
              funcionarioNome: funcionario.funcionarioNome,
              qualificacao: funcionario.qualificacao,
              empresaId: company.companyId,
            }
          : {
              funcionarioId: user.id,
              funcionarioNome: user.name || user.email,
              qualificacao: "outro" as any,
              empresaId: company.companyId,
            };

        await registrarAuditoria(
          company.companyId,
          actor,
          "editar_pedido",
          "ordens",
          orderId,
          { updates },
        );
      }
    } catch (error) {
      console.error("[OrdersContext] Erro ao atualizar ordem:", error);
      throw error;
    }
  };

  const faturarOrder = async (
    orderId: string,
    options?: {
      dueDate?: Date;
      parcelas?: number;
      formaPagamento?: string;
    },
  ) => {
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    const order = orders.find((item) => item.orderId === orderId);
    if (!order) throw new Error("Pedido não encontrado");

    if (order.status === "faturado" || order.status === "faturada") {
      throw new Error("Pedido já faturado");
    }

    const dueDate =
      options?.dueDate ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        return d;
      })();
    const parcelas = Math.max(1, options?.parcelas || 1);
    const valorTotal = order.total || order.totalValue;

    const invoiceNumber = `NF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const invoiceRef = await addDoc(collection(db, "invoices"), {
      companyId: company.companyId,
      invoiceNumber,
      orderId: order.orderId,
      clientId: order.clientId,
      clientName: order.clientName,
      issueDate: new Date(),
      dueDate,
      status: "enviada",
      items: order.items,
      subtotal: order.subtotal || order.totalValue,
      taxes: 0,
      discount: order.discount || 0,
      totalValue: valorTotal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "orders", orderId), {
      status: "faturado",
      completionDate: new Date(),
      updatedAt: serverTimestamp(),
    });

    if (parcelas > 1) {
      const valorParcela =
        Math.round((valorTotal / parcelas + Number.EPSILON) * 100) / 100;
      for (let parcela = 1; parcela <= parcelas; parcela += 1) {
        const vencimento = new Date(dueDate);
        vencimento.setMonth(vencimento.getMonth() + (parcela - 1));

        await addDoc(collection(db, "contas_receber"), {
          companyId: company.companyId,
          clienteId: order.clientId,
          clienteNome: order.clientName,
          pedidoId: order.orderId,
          invoiceId: invoiceRef.id,
          valor: valorParcela,
          dataVencimento: vencimento,
          status: "pendente",
          formaPagamento: options?.formaPagamento || "boleto",
          parcela,
          totalParcelas: parcelas,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await addDoc(collection(db, "contas_receber"), {
        companyId: company.companyId,
        clienteId: order.clientId,
        clienteNome: order.clientName,
        pedidoId: order.orderId,
        invoiceId: invoiceRef.id,
        valor: valorTotal,
        dataVencimento: dueDate,
        status: "pendente",
        formaPagamento: options?.formaPagamento || "boleto",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    setOrders((prev) =>
      prev.map((item) =>
        item.orderId === orderId
          ? { ...item, status: "faturado", updatedAt: new Date() }
          : item,
      ),
    );

    if (company.companyId && user?.id) {
      const actor = funcionario
        ? {
            funcionarioId: funcionario.funcionarioId,
            funcionarioNome: funcionario.funcionarioNome,
            qualificacao: funcionario.qualificacao,
            empresaId: company.companyId,
          }
        : {
            funcionarioId: user.id,
            funcionarioNome: user.name || user.email,
            qualificacao: "outro" as any,
            empresaId: company.companyId,
          };

      await registrarAuditoria(
        company.companyId,
        actor,
        "faturar_pedido",
        "financeiro",
        orderId,
        {
          invoiceId: invoiceRef.id,
          valorTotal,
          parcelas,
        },
      );
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));

      if (company?.companyId && user?.id) {
        const actor = funcionario
          ? {
              funcionarioId: funcionario.funcionarioId,
              funcionarioNome: funcionario.funcionarioNome,
              qualificacao: funcionario.qualificacao,
              empresaId: company.companyId,
            }
          : {
              funcionarioId: user.id,
              funcionarioNome: user.name || user.email,
              qualificacao: "outro" as any,
              empresaId: company.companyId,
            };

        await registrarAuditoria(
          company.companyId,
          actor,
          "deletar_pedido",
          "ordens",
          orderId,
          {},
        );
      }
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
        faturarOrder,
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
