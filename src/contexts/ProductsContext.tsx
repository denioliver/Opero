import React, { createContext, useCallback, useContext, useState } from "react";
import { Product } from "../types";
import { useCompany } from "./CompanyContext";
import { useAuth } from "./AuthContext";
import { useFuncionario } from "./FuncionarioContext";
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
import {
  MovimentacaoEstoque,
  TipoMovimentacao,
  AlertaEstoque,
  RelatorioEstoque,
  RelatorioProdutosMaisVendidos,
  RelatorioGiroEstoque,
} from "../domains/produtos/movimentacao";
import * as productService from "../services/firebase/productService";
import { registrarAuditoria } from "../services/firebase/auditoriaService";
import { requireDeviceSecurity } from "../utils/deviceSecurity";

interface ProductsContextType {
  // Produtos
  products: Product[];
  isLoadingProducts: boolean;
  productsError: string | null;

  // Alertas
  alertas: AlertaEstoque[];
  isLoadingAlertas: boolean;

  // Histórico
  historicoMovimentacao: MovimentacaoEstoque[];
  isLoadingHistorico: boolean;

  // Relatórios
  relatorioEstoque: RelatorioEstoque[];
  relatorioProdutosMaisVendidos: RelatorioProdutosMaisVendidos[];
  relatorioGiroEstoque: RelatorioGiroEstoque[];

  // Métodos CRUD
  loadProducts: () => Promise<void>;
  addProduct: (
    product: Omit<Product, "productId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateProduct: (
    productId: string,
    updates: Partial<Product>,
  ) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  // Métodos de estoque
  registrarMovimentacao: (
    productId: string,
    tipo: TipoMovimentacao,
    quantidade: number,
    dados: any,
  ) => Promise<void>;
  obterHistorico: (productId: string) => Promise<void>;

  // Métodos de alertas
  loadAlertas: () => Promise<void>;
  marcarAlertaComoLido: (alertaId: string) => Promise<void>;

  // Métodos de relatórios
  gerarRelatorioEstoque: () => Promise<void>;
  gerarRelatorioProdutosMaisVendidos: (dias?: number) => Promise<void>;
  gerarRelatorioGiroEstoque: () => Promise<void>;

  // Utilidade
  clearProductsError: () => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined,
);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();

  // Produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Alertas
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [isLoadingAlertas, setIsLoadingAlertas] = useState(false);

  // Histórico
  const [historicoMovimentacao, setHistoricoMovimentacao] = useState<
    MovimentacaoEstoque[]
  >([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);

  // Relatórios
  const [relatorioEstoque, setRelatorioEstoque] = useState<RelatorioEstoque[]>(
    [],
  );
  const [relatorioProdutosMaisVendidos, setRelatorioProdutosMaisVendidos] =
    useState<RelatorioProdutosMaisVendidos[]>([]);
  const [relatorioGiroEstoque, setRelatorioGiroEstoque] = useState<
    RelatorioGiroEstoque[]
  >([]);

  const assertCanWrite = async () => {
    if (funcionario?.readOnlyAccess) {
      throw new Error(
        "Seu acesso está em modo somente visualização. Você pode apenas consultar dados.",
      );
    }
    await requireDeviceSecurity("executar esta ação");
  };

  const getActor = useCallback(() => {
    if (!company?.companyId) {
      return null;
    }

    if (funcionario) {
      return {
        funcionarioId: funcionario.funcionarioId,
        funcionarioNome: funcionario.funcionarioNome,
        qualificacao: funcionario.qualificacao,
        empresaId: company.companyId,
      };
    }

    if (!user?.id) {
      return null;
    }

    const nomeUsuario = (user.name || "").trim();
    const nomeProprietario = (company.ownerName || "").trim();
    const nomeGenerico = /^(usu[aá]rio|usuario|user)$/i.test(nomeUsuario);
    const proprietarioGenerico = /^(usu[aá]rio|usuario|user)$/i.test(
      nomeProprietario,
    );

    return {
      funcionarioId: user.id,
      funcionarioNome:
        (!nomeGenerico && nomeUsuario) ||
        (!proprietarioGenerico && nomeProprietario) ||
        user.email ||
        "Proprietário",
      qualificacao: "outro" as const,
      empresaId: company.companyId,
    };
  }, [company?.companyId, funcionario, user?.email, user?.id, user?.name]);

  const loadProducts = useCallback(async () => {
    if (!company?.companyId) return;

    try {
      setIsLoadingProducts(true);
      setProductsError(null);

      const q = query(
        collection(db, "products"),
        where("companyId", "==", company.companyId),
        where("active", "==", true),
      );

      const querySnapshot = await getDocs(q);
      const productsList: Product[] = [];

      querySnapshot.forEach((doc) => {
        productsList.push({
          ...doc.data(),
          productId: doc.id,
        } as Product);
      });

      setProducts(productsList);
    } catch (error) {
      console.error("[ProductsContext] Erro ao carregar produtos:", error);
      setProductsError("Erro ao carregar produtos");
    } finally {
      setIsLoadingProducts(false);
    }
  }, [company?.companyId]);

  const addProduct = async (
    product: Omit<Product, "productId" | "createdAt" | "updatedAt">,
  ) => {
    await assertCanWrite();
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    try {
      const docRef = await addDoc(collection(db, "products"), {
        ...product,
        companyId: company.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setProducts((prev) => [
        ...prev,
        {
          ...product,
          productId: docRef.id,
          companyId: company.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const actor = getActor();
      if (actor) {
        await registrarAuditoria(
          company.companyId,
          actor,
          "criar_produto",
          "produtos",
          docRef.id,
          {
            nome: product.name,
            categoria: product.category,
            preco: product.price,
            estoque: product.stock,
          },
        );
      }
    } catch (error) {
      console.error("[ProductsContext] Erro ao adicionar produto:", error);
      throw error;
    }
  };

  const updateProduct = async (
    productId: string,
    updates: Partial<Product>,
  ) => {
    await assertCanWrite();
    try {
      await updateDoc(doc(db, "products", productId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.productId === productId
            ? { ...p, ...updates, updatedAt: new Date() }
            : p,
        ),
      );

      const actor = getActor();
      if (actor && company?.companyId) {
        await registrarAuditoria(
          company.companyId,
          actor,
          "editar_produto",
          "produtos",
          productId,
          { updates },
        );
      }
    } catch (error) {
      console.error("[ProductsContext] Erro ao atualizar produto:", error);
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    await assertCanWrite();
    try {
      // Soft delete: apenas marcar como inativo
      await updateDoc(doc(db, "products", productId), {
        active: false,
        updatedAt: new Date(),
      });

      setProducts((prev) => prev.filter((p) => p.productId !== productId));

      const actor = getActor();
      if (actor && company?.companyId) {
        await registrarAuditoria(
          company.companyId,
          actor,
          "deletar_produto",
          "produtos",
          productId,
          { active: false },
        );
      }
    } catch (error) {
      console.error("[ProductsContext] Erro ao deletar produto:", error);
      throw error;
    }
  };

  const registrarMovimentacao = async (
    productId: string,
    tipo: TipoMovimentacao,
    quantidade: number,
    dados: any,
  ) => {
    await assertCanWrite();
    if (!company?.companyId) throw new Error("Empresa não encontrada");

    try {
      await productService.registrarMovimentacaoEstoque(
        company.companyId,
        productId,
        tipo,
        quantidade,
        "current-user", // TODO: Obter do contexto de autenticação
        dados,
      );

      const actor = getActor();
      if (actor) {
        await registrarAuditoria(
          company.companyId,
          actor,
          "movimentar_estoque",
          "produtos",
          productId,
          {
            tipo,
            quantidade,
            dados,
          },
        );
      }

      // Recarregar produtos após movimentação
      await loadProducts();
    } catch (error) {
      console.error("[ProductsContext] Erro ao registrar movimentação:", error);
      throw error;
    }
  };

  const obterHistorico = async (productId: string) => {
    try {
      setIsLoadingHistorico(true);
      const historico =
        await productService.obterHistoricoMovimentacao(productId);
      setHistoricoMovimentacao(historico);
    } catch (error) {
      console.error("[ProductsContext] Erro ao obter histórico:", error);
      throw error;
    } finally {
      setIsLoadingHistorico(false);
    }
  };

  const loadAlertas = useCallback(async () => {
    if (!company?.companyId) return;

    try {
      setIsLoadingAlertas(true);
      const alertas = await productService.obterAlertas(company.companyId);
      setAlertas(alertas);
    } catch (error) {
      console.error("[ProductsContext] Erro ao carregar alertas:", error);
    } finally {
      setIsLoadingAlertas(false);
    }
  }, [company?.companyId]);

  const marcarAlertaComoLido = async (alertaId: string) => {
    try {
      await productService.marcarAlertaComoLido(alertaId);
      setAlertas((prev) =>
        prev.map((a) => (a.alertaId === alertaId ? { ...a, lido: true } : a)),
      );
    } catch (error) {
      console.error("[ProductsContext] Erro ao marcar alerta:", error);
      throw error;
    }
  };

  const gerarRelatorioEstoque = async () => {
    if (!company?.companyId) return;

    try {
      const relatorio = await productService.obterRelatorioEstoque(
        company.companyId,
      );
      setRelatorioEstoque(relatorio);
    } catch (error) {
      console.error(
        "[ProductsContext] Erro ao gerar relatório de estoque:",
        error,
      );
      throw error;
    }
  };

  const gerarRelatorioProdutosMaisVendidos = async (dias: number = 30) => {
    if (!company?.companyId) return;

    try {
      const relatorio = await productService.obterRelatorioProdutosMaisVendidos(
        company.companyId,
        dias,
      );
      setRelatorioProdutosMaisVendidos(relatorio);
    } catch (error) {
      console.error(
        "[ProductsContext] Erro ao gerar relatório de vendas:",
        error,
      );
      throw error;
    }
  };

  const gerarRelatorioGiroEstoque = async () => {
    if (!company?.companyId) return;

    try {
      const relatorio = await productService.obterRelatorioGiroEstoque(
        company.companyId,
      );
      setRelatorioGiroEstoque(relatorio);
    } catch (error) {
      console.error(
        "[ProductsContext] Erro ao gerar relatório de giro:",
        error,
      );
      throw error;
    }
  };

  const clearProductsError = useCallback(() => setProductsError(null), []);

  return (
    <ProductsContext.Provider
      value={{
        // Produtos
        products,
        isLoadingProducts,
        productsError,

        // Alertas
        alertas,
        isLoadingAlertas,

        // Histórico
        historicoMovimentacao,
        isLoadingHistorico,

        // Relatórios
        relatorioEstoque,
        relatorioProdutosMaisVendidos,
        relatorioGiroEstoque,

        // Métodos CRUD
        loadProducts,
        addProduct,
        updateProduct,
        deleteProduct,

        // Métodos de estoque
        registrarMovimentacao,
        obterHistorico,

        // Métodos de alertas
        loadAlertas,
        marcarAlertaComoLido,

        // Métodos de relatórios
        gerarRelatorioEstoque,
        gerarRelatorioProdutosMaisVendidos,
        gerarRelatorioGiroEstoque,

        // Utilidade
        clearProductsError,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextType {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts deve ser usado dentro de ProductsProvider");
  }
  return context;
}
