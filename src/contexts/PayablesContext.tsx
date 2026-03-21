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
import { ContaPagar } from "../domains/financeiro/contas";
import { useAuth } from "./AuthContext";
import { useFuncionario } from "./FuncionarioContext";
import { registrarAuditoria } from "../services/firebase/auditoriaService";
import { requireDeviceSecurity } from "../utils/deviceSecurity";

interface PayablesContextType {
  contasPagar: ContaPagar[];
  isLoadingContasPagar: boolean;
  loadContasPagar: () => Promise<void>;
  criarContaPagar: (
    payload: Omit<
      ContaPagar,
      "contaPagarId" | "companyId" | "createdAt" | "updatedAt"
    >,
  ) => Promise<void>;
  pagarConta: (contaPagarId: string, formaPagamento: string) => Promise<void>;
  gerarRecorrencia: (contaPagarId: string) => Promise<void>;
  atualizarAtrasosPagar: () => Promise<void>;
  totalPendentePagar: number;
  totalPagoPagar: number;
  totalAtrasadoPagar: number;
}

const PayablesContext = createContext<PayablesContextType | undefined>(
  undefined,
);

const toDate = (value: any): Date => {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

export function PayablesProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [isLoadingContasPagar, setIsLoadingContasPagar] = useState(false);

  const assertCanWrite = async () => {
    if (funcionario?.readOnlyAccess) {
      throw new Error(
        "Seu acesso está em modo somente visualização. Você pode apenas consultar dados.",
      );
    }
    await requireDeviceSecurity("executar esta ação");
  };

  const loadContasPagar = async () => {
    if (!company?.companyId) return;

    try {
      setIsLoadingContasPagar(true);
      const q = query(
        collection(db, "contas_pagar"),
        where("companyId", "==", company.companyId),
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          ...data,
          contaPagarId: item.id,
          dataVencimento: toDate(data.dataVencimento),
          dataPagamento: data.dataPagamento
            ? toDate(data.dataPagamento)
            : undefined,
          proximaRecorrencia: data.proximaRecorrencia
            ? toDate(data.proximaRecorrencia)
            : undefined,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        } as ContaPagar;
      });

      list.sort(
        (a, b) => b.dataVencimento.getTime() - a.dataVencimento.getTime(),
      );
      setContasPagar(list);
    } finally {
      setIsLoadingContasPagar(false);
    }
  };

  const criarContaPagar = async (
    payload: Omit<
      ContaPagar,
      "contaPagarId" | "companyId" | "createdAt" | "updatedAt"
    >,
  ) => {
    await assertCanWrite();
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    await addDoc(collection(db, "contas_pagar"), {
      ...payload,
      companyId: company.companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await loadContasPagar();

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
        "criar_conta_pagar",
        "financeiro",
        payload.fornecedorId || payload.descricao || "conta_pagar",
        {
          valor: payload.valor,
          tipo: payload.tipo,
        },
      );
    }
  };

  const pagarConta = async (contaPagarId: string, formaPagamento: string) => {
    await assertCanWrite();
    await updateDoc(doc(db, "contas_pagar", contaPagarId), {
      status: "pago",
      formaPagamento,
      dataPagamento: new Date(),
      updatedAt: serverTimestamp(),
    });

    await loadContasPagar();

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
        "pagar_conta",
        "financeiro",
        contaPagarId,
        { formaPagamento },
      );
    }
  };

  const gerarRecorrencia = async (contaPagarId: string) => {
    await assertCanWrite();
    const conta = contasPagar.find(
      (item) => item.contaPagarId === contaPagarId,
    );
    if (!conta || !conta.recorrencia || conta.recorrencia === "nenhuma") return;

    const proximo = new Date(conta.dataVencimento);
    if (conta.recorrencia === "mensal")
      proximo.setMonth(proximo.getMonth() + 1);
    if (conta.recorrencia === "trimestral")
      proximo.setMonth(proximo.getMonth() + 3);
    if (conta.recorrencia === "anual")
      proximo.setFullYear(proximo.getFullYear() + 1);

    await criarContaPagar({
      fornecedorId: conta.fornecedorId,
      fornecedorNome: conta.fornecedorNome,
      valor: conta.valor,
      dataVencimento: proximo,
      status: "pendente",
      tipo: conta.tipo,
      descricao: conta.descricao,
      formaPagamento: conta.formaPagamento,
      recorrencia: conta.recorrencia,
      proximaRecorrencia: proximo,
      dataPagamento: undefined,
    });
  };

  const atualizarAtrasosPagar = async () => {
    if (funcionario?.readOnlyAccess) {
      throw new Error(
        "Seu acesso está em modo somente visualização. Você pode apenas consultar dados.",
      );
    }
    const hoje = new Date();
    const pendentes = contasPagar.filter(
      (item) => item.status === "pendente" && item.dataVencimento < hoje,
    );

    for (const item of pendentes) {
      await updateDoc(doc(db, "contas_pagar", item.contaPagarId), {
        status: "atrasado",
        updatedAt: serverTimestamp(),
      });
    }

    if (pendentes.length > 0) {
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
          "atualizar_atrasos_contas_pagar",
          "financeiro",
          "contas_pagar",
          {
            quantidadeAtualizada: pendentes.length,
            contaIds: pendentes.map((item) => item.contaPagarId),
          },
        );
      }

      await loadContasPagar();
    }
  };

  const totalPendentePagar = useMemo(
    () =>
      contasPagar
        .filter((item) => item.status === "pendente")
        .reduce((sum, item) => sum + item.valor, 0),
    [contasPagar],
  );

  const totalPagoPagar = useMemo(
    () =>
      contasPagar
        .filter((item) => item.status === "pago")
        .reduce((sum, item) => sum + item.valor, 0),
    [contasPagar],
  );

  const totalAtrasadoPagar = useMemo(
    () =>
      contasPagar
        .filter((item) => item.status === "atrasado")
        .reduce((sum, item) => sum + item.valor, 0),
    [contasPagar],
  );

  return (
    <PayablesContext.Provider
      value={{
        contasPagar,
        isLoadingContasPagar,
        loadContasPagar,
        criarContaPagar,
        pagarConta,
        gerarRecorrencia,
        atualizarAtrasosPagar,
        totalPendentePagar,
        totalPagoPagar,
        totalAtrasadoPagar,
      }}
    >
      {children}
    </PayablesContext.Provider>
  );
}

export function usePayables() {
  const context = useContext(PayablesContext);
  if (!context) {
    throw new Error("usePayables deve ser usado dentro de PayablesProvider");
  }
  return context;
}
