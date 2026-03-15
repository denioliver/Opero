import React, { createContext, useContext, useState } from 'react';
import { Client } from '../types';
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

interface ClientsContextType {
  clients: Client[];
  isLoadingClients: boolean;
  clientsError: string | null;
  loadClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'clientId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  clearClientsError: () => void;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const loadClients = async () => {
    if (!company?.companyId) return;

    try {
      setIsLoadingClients(true);
      setClientsError(null);

      const q = query(
        collection(db, 'clients'),
        where('companyId', '==', company.companyId)
      );

      const querySnapshot = await getDocs(q);
      const clientsList: Client[] = [];

      querySnapshot.forEach((doc) => {
        clientsList.push({
          ...doc.data(),
          clientId: doc.id,
        } as Client);
      });

      setClients(clientsList);
    } catch (error) {
      console.error('[ClientsContext] Erro ao carregar clientes:', error);
      setClientsError('Erro ao carregar clientes');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const addClient = async (client: Omit<Client, 'clientId' | 'createdAt' | 'updatedAt'>) => {
    if (!company?.companyId) throw new Error('Empresa não encontrada');

    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...client,
        companyId: company.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setClients((prev) => [
        ...prev,
        {
          ...client,
          clientId: docRef.id,
          companyId: company.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error('[ClientsContext] Erro ao adicionar cliente:', error);
      throw error;
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      await updateDoc(doc(db, 'clients', clientId), {
        ...updates,
        updatedAt: new Date(),
      });

      setClients((prev) =>
        prev.map((c) =>
          c.clientId === clientId
            ? { ...c, ...updates, updatedAt: new Date() }
            : c
        )
      );
    } catch (error) {
      console.error('[ClientsContext] Erro ao atualizar cliente:', error);
      throw error;
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      setClients((prev) => prev.filter((c) => c.clientId !== clientId));
    } catch (error) {
      console.error('[ClientsContext] Erro ao deletar cliente:', error);
      throw error;
    }
  };

  const clearClientsError = () => setClientsError(null);

  return (
    <ClientsContext.Provider
      value={{
        clients,
        isLoadingClients,
        clientsError,
        loadClients,
        addClient,
        updateClient,
        deleteClient,
        clearClientsError,
      }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients(): ClientsContextType {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients deve ser usado dentro de ClientsProvider');
  }
  return context;
}
