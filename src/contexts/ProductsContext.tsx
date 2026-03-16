import React, { createContext, useContext, useState } from "react";
import { Product } from "../types";
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

interface ProductsContextType {
  products: Product[];
  isLoadingProducts: boolean;
  productsError: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (
    product: Omit<Product, "productId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateProduct: (
    productId: string,
    updates: Partial<Product>,
  ) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  clearProductsError: () => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined,
);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const loadProducts = async () => {
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
  };

  const addProduct = async (
    product: Omit<Product, "productId" | "createdAt" | "updatedAt">,
  ) => {
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
    } catch (error) {
      console.error("[ProductsContext] Erro ao adicionar produto:", error);
      throw error;
    }
  };

  const updateProduct = async (
    productId: string,
    updates: Partial<Product>,
  ) => {
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
    } catch (error) {
      console.error("[ProductsContext] Erro ao atualizar produto:", error);
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      // Soft delete: apenas marcar como inativo
      await updateDoc(doc(db, "products", productId), {
        active: false,
        updatedAt: new Date(),
      });

      setProducts((prev) => prev.filter((p) => p.productId !== productId));
    } catch (error) {
      console.error("[ProductsContext] Erro ao deletar produto:", error);
      throw error;
    }
  };

  const clearProductsError = () => setProductsError(null);

  return (
    <ProductsContext.Provider
      value={{
        products,
        isLoadingProducts,
        productsError,
        loadProducts,
        addProduct,
        updateProduct,
        deleteProduct,
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
