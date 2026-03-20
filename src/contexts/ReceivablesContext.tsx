import React, { createContext, useContext, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useCompany } from "./CompanyContext";
import { ContaReceber } from "../domains/financeiro/contas";
import { useAuth } from "./AuthContext";
import { useFuncionario } from "./FuncionarioContext";
import { registrarAuditoria } from "../services/firebase/auditoriaService";

interface ReceivablesContextType {
  contasReceber: ContaReceber[];
  isLoadingContasReceber: boolean;
  loadContasReceber: () => Promise<void>;
  gerarContaReceber: (
    payload: Omit<
      ContaReceber,
      "contaReceberId" | "companyId" | "status" | "createdAt" | "updatedAt"
    >,
  ) => Promise<string>;
  gerarParcelamentoReceber: (params: {
    clienteId: string;
    clienteNome?: string;
    pedidoId: string;
    invoiceId?: string;
    valorTotal: number;
    parcelas: number;
    primeiraDataVencimento: Date;
    formaPagamento?: string;
  }) => Promise<void>;
  baixarPagamento: (
    contaReceberId: string,
    formaPagamento: string,
  ) => Promise<void>;
  atualizarAtrasos: () => Promise<void>;
  totalPendente: number;
  totalAtrasado: number;
  totalPago: number;
}

const ReceivablesContext = createContext<ReceivablesContextType | undefined>(
  undefined,
);

const toDate = (value: any): Date => {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

export function ReceivablesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [isLoadingContasReceber, setIsLoadingContasReceber] = useState(false);

  const loadContasReceber = async () => {
    if (!company?.companyId) return;

    try {
      setIsLoadingContasReceber(true);
      const q = query(
        collection(db, "contas_receber"),
        where("companyId", "==", company.companyId),
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          ...data,
          contaReceberId: item.id,
          dataVencimento: toDate(data.dataVencimento),
          dataPagamento: data.dataPagamento
            ? toDate(data.dataPagamento)
            : undefined,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        } as ContaReceber;
      });

      list.sort(
        (a, b) => b.dataVencimento.getTime() - a.dataVencimento.getTime(),
      );
      setContasReceber(list);
    } finally {
      setIsLoadingContasReceber(false);
    }
  };

  const gerarContaReceber = async (
    payload: Omit<
      ContaReceber,
      "contaReceberId" | "companyId" | "status" | "createdAt" | "updatedAt"
    >,
  ) => {
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    const docRef = await addDoc(collection(db, "contas_receber"), {
      ...payload,
      companyId: company.companyId,
      status: "pendente",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await loadContasReceber();

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
        "criar_conta_receber",
        "financeiro",
        docRef.id,
        {
          clienteId: payload.clienteId,
          pedidoId: payload.pedidoId,
          valor: payload.valor,
        },
      );
    }

    return docRef.id;
  };

  const gerarParcelamentoReceber = async (params: {
    clienteId: string;
    clienteNome?: string;
    pedidoId: string;
    invoiceId?: string;
    valorTotal: number;
    parcelas: number;
    primeiraDataVencimento: Date;
    formaPagamento?: string;
  }) => {
    const {
      clienteId,
      clienteNome,
      pedidoId,
      invoiceId,
      valorTotal,
      parcelas,
      primeiraDataVencimento,
      formaPagamento,
    } = params;

    if (parcelas <= 1) {
      await gerarContaReceber({
        clienteId,
        clienteNome,
        pedidoId,
        invoiceId,
        valor: valorTotal,
        dataVencimento: primeiraDataVencimento,
        formaPagamento,
      });
      return;
    }

    const valorParcela =
      Math.round((valorTotal / parcelas + Number.EPSILON) * 100) / 100;

    for (let parcela = 1; parcela <= parcelas; parcela += 1) {
      const vencimento = new Date(primeiraDataVencimento);
      vencimento.setMonth(vencimento.getMonth() + (parcela - 1));

      await gerarContaReceber({
        clienteId,
        clienteNome,
        pedidoId,
        invoiceId,
        valor: valorParcela,
        dataVencimento: vencimento,
        formaPagamento,
        parcela,
        totalParcelas: parcelas,
      });
    }
  };

  const baixarPagamento = async (
    contaReceberId: string,
    formaPagamento: string,
  ) => {
    await updateDoc(doc(db, "contas_receber", contaReceberId), {
      status: "pago",
      formaPagamento,
      dataPagamento: new Date(),
      updatedAt: serverTimestamp(),
    });

    await loadContasReceber();

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
        "baixar_pagamento",
        "financeiro",
        contaReceberId,
        { formaPagamento },
      );
    }
  };

  const atualizarAtrasos = async () => {
    const hoje = new Date();
    const pendentes = contasReceber.filter(
      (item) => item.status === "pendente" && item.dataVencimento < hoje,
    );

    for (const item of pendentes) {
      await updateDoc(doc(db, "contas_receber", item.contaReceberId), {
        status: "atrasado",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "alertas_sistema"), {
        companyId: company?.companyId,
        tipo: "pagamento_atrasado",
        titulo: "Conta a receber em atraso",
        descricao: `${item.clienteNome || item.clienteId} possui pagamento em atraso de R$ ${item.valor.toFixed(2)}`,
        origemId: item.contaReceberId,
        lido: false,
        createdAt: serverTimestamp(),
      });
    }

    if (pendentes.length > 0) {
      await loadContasReceber();
    }
  };

  const totalPendente = useMemo(
    () =>
      contasReceber
        .filter((item) => item.status === "pendente")
        .reduce((sum, item) => sum + item.valor, 0),
    [contasReceber],
  );

  const totalAtrasado = useMemo(
    () =>
      contasReceber
        .filter((item) => item.status === "atrasado")
        .reduce((sum, item) => sum + item.valor, 0),
    [contasReceber],
  );

  const totalPago = useMemo(
    () =>
      contasReceber
        .filter((item) => item.status === "pago")
        .reduce((sum, item) => sum + item.valor, 0),
    [contasReceber],
  );

  return (
    <ReceivablesContext.Provider
      value={{
        contasReceber,
        isLoadingContasReceber,
        loadContasReceber,
        gerarContaReceber,
        gerarParcelamentoReceber,
        baixarPagamento,
        atualizarAtrasos,
        totalPendente,
        totalAtrasado,
        totalPago,
      }}
    >
      {children}
    </ReceivablesContext.Provider>
  );
}

export function useReceivables() {
  const context = useContext(ReceivablesContext);
  if (!context) {
    throw new Error(
      "useReceivables deve ser usado dentro de ReceivablesProvider",
    );
  }

  return context;
}
