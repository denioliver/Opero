import React, { createContext, useContext, useState } from 'react';
import { ServiceOrder, OrderStatus } from '../types';
import { useCompany } from './CompanyContext';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

interface OrdersContextType {
  orders: ServiceOrder[];
  isLoadingOrders: boolean;
  ordersError: string | null;
  loadOrders: (status?: OrderStatus) => Promise<void>;
  addOrder: (order: Omit<ServiceOrder, 'orderId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<ServiceOrder>) => Promise<void>;
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
          collection(db, 'orders'),
          where('companyId', '==', company.companyId),
          where('status', '==', status)
        );
      } else {
        q = query(
          collection(db, 'orders'),
          where('companyId', '==', company.companyId)
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
      console.error('[OrdersContext] Erro ao carregar ordens:', error);
      setOrdersError('Erro ao carregar ordens de serviço');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const addOrder = async (order: Omit<ServiceOrder, 'orderId' | 'createdAt' | 'updatedAt'>) => {
    if (!company?.companyId) throw new Error('Empresa não encontrada');

    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...order,
        companyId: company.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setOrders((prev) => [
        ...prev,
        {
          ...order,
          orderId: docRef.id,
          companyId: company.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error('[OrdersContext] Erro ao adicionar ordem:', error);
      throw error;
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<ServiceOrder>) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        ...updates,
        updatedAt: new Date(),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, ...updates, updatedAt: new Date() }
            : o
        )
      );
    } catch (error) {
      console.error('[OrdersContext] Erro ao atualizar ordem:', error);
      throw error;
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    } catch (error) {
      console.error('[OrdersContext] Erro ao deletar ordem:', error);
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
    throw new Error('useOrders deve ser usado dentro de OrdersProvider');
  }
  return context;
}
