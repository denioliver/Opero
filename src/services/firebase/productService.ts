/**
 * Serviço de Produtos com funcionalidades completas de estoque e auditoria
 */

import { db } from '../../config/firebase';
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
  orderBy,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { Product } from '../../types';
import {
  MovimentacaoEstoque,
  TipoMovimentacao,
  UltimaCompra,
  UltimaVenda,
  RelatorioEstoque,
  RelatorioProdutosMaisVendidos,
  RelatorioGiroEstoque,
  AlertaEstoque,
} from '../../domains/produtos/movimentacao';

// ============================================================================
// CRUD BÁSICO
// ============================================================================

export async function createProduct(
  companyId: string,
  productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>,
  userId: string,
): Promise<Product> {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      companyId,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      ...productData,
      productId: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('[productService] Erro ao criar produto:', error);
    throw error;
  }
}

export async function updateProduct(
  productId: string,
  updates: Partial<Product>,
  userId: string,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...updates,
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[productService] Erro ao atualizar produto:', error);
    throw error;
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    // Soft delete
    await updateDoc(doc(db, 'products', productId), {
      active: false,
      status: 'inativo',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[productService] Erro ao deletar produto:', error);
    throw error;
  }
}

export async function getProductsByCompany(companyId: string): Promise<Product[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('companyId', '==', companyId),
      where('active', '==', true),
      orderBy('name'),
    );

    const querySnapshot = await getDocs(q);
    const products: Product[] = [];

    querySnapshot.forEach((doc) => {
      products.push({
        ...doc.data(),
        productId: doc.id,
      } as Product);
    });

    return products;
  } catch (error) {
    console.error('[productService] Erro ao buscar produtos:', error);
    throw error;
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDocs(query(
      collection(db, 'products'),
      where('productId', '==', productId),
    ));

    if (docSnap.empty) return null;

    const data = docSnap.docs[0].data();
    return {
      ...data,
      productId: docSnap.docs[0].id,
    } as Product;
  } catch (error) {
    console.error('[productService] Erro ao buscar produto:', error);
    throw error;
  }
}

// ============================================================================
// MOVIMENTAÇÃO DE ESTOQUE
// ============================================================================

export async function registrarMovimentacaoEstoque(
  companyId: string,
  productId: string,
  tipo: TipoMovimentacao,
  quantidade: number,
  userId: string,
  dados: {
    orderId?: string;
    novoId?: string;
    fornecedorId?: string;
    clienteId?: string;
    descricao?: string;
    observacoes?: string;
  },
): Promise<MovimentacaoEstoque> {
  try {
    // Buscar estoque atual
    const q = query(
      collection(db, 'products'),
      where('productId', '==', productId),
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Produto não encontrado');
    }

    const productDoc = querySnapshot.docs[0];
    const product = productDoc.data() as Product;
    const saldoAnterior = product.currentStock || 0;

    // Calcular novo saldo baseado no tipo de movimentação
    let novaQuantidade = saldoAnterior;
    if (['entrada_compra', 'devolucao_cliente', 'inventario'].includes(tipo)) {
      novaQuantidade += quantidade;
    } else {
      novaQuantidade -= quantidade;
    }

    // Garantir que não fique negativo
    novaQuantidade = Math.max(0, novaQuantidade);

    // Registrar movimentação
    const movRef = await addDoc(collection(db, 'estoque_movimentacoes'), {
      companyId,
      produtoId: productId,
      tipo,
      quantidade,
      saldoAnterior,
      saldoAtual: novaQuantidade,
      ...dados,
      criadoPor: userId,
      data: new Date(),
      createdAt: serverTimestamp(),
    });

    // Atualizar estoque no produto
    await updateDoc(productDoc.ref, {
      currentStock: novaQuantidade,
      updatedAt: serverTimestamp(),
    });

    // Verificar se precisa gerar alertas
    await gerarAlertasEstoque(companyId, productId, novaQuantidade, product);

    return {
      movimentacaoId: movRef.id,
      companyId,
      produtoId: productId,
      tipo,
      quantidade,
      saldoAnterior,
      saldoAtual: novaQuantidade,
      ...dados,
      criadoPor: userId,
      data: new Date(),
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('[productService] Erro ao registrar movimentação:', error);
    throw error;
  }
}

// ============================================================================
// HISTÓRICO E ÚLTIMAS MOVIMENTAÇÕES
// ============================================================================

export async function obterHistoricoMovimentacao(
  productId: string,
  limiteRegistros: number = 50,
): Promise<MovimentacaoEstoque[]> {
  try {
    const q = query(
      collection(db, 'estoque_movimentacoes'),
      where('produtoId', '==', productId),
      orderBy('data', 'desc'),
      limit(limiteRegistros),
    );

    const querySnapshot = await getDocs(q);
    const movimentacoes: MovimentacaoEstoque[] = [];

    querySnapshot.forEach((doc) => {
      movimentacoes.push({
        ...doc.data(),
        movimentacaoId: doc.id,
      } as MovimentacaoEstoque);
    });

    return movimentacoes;
  } catch (error) {
    console.error('[productService] Erro ao obter histórico:', error);
    throw error;
  }
}

export async function obterUltimaCompra(
  productId: string,
): Promise<UltimaCompra | null> {
  try {
    const q = query(
      collection(db, 'estoque_movimentacoes'),
      where('produtoId', '==', productId),
      where('tipo', '==', 'entrada_compra'),
      orderBy('data', 'desc'),
      limit(1),
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const mov = querySnapshot.docs[0].data() as MovimentacaoEstoque;
    return {
      produtoId: mov.produtoId,
      fornecedorId: mov.fornecedorId,
      dataCompra: mov.data instanceof Date ? mov.data : new Date(mov.data),
      quantidadeComprada: mov.quantidade,
      precoUnitario: 0, // Precisa ser armazenado na movimentação
      precoTotal: 0,
    };
  } catch (error) {
    console.error('[productService] Erro ao obter última compra:', error);
    return null;
  }
}

export async function obterUltimaVenda(
  productId: string,
): Promise<UltimaVenda | null> {
  try {
    const q = query(
      collection(db, 'estoque_movimentacoes'),
      where('produtoId', '==', productId),
      where('tipo', '==', 'saida_venda'),
      orderBy('data', 'desc'),
      limit(1),
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const mov = querySnapshot.docs[0].data() as MovimentacaoEstoque;
    return {
      produtoId: mov.produtoId,
      clienteId: mov.clienteId,
      dataVenda: mov.data instanceof Date ? mov.data : new Date(mov.data),
      quantidadeVendida: mov.quantidade,
      precoUnitario: 0, // Precisa ser armazenado na movimentação
      precoTotal: 0,
    };
  } catch (error) {
    console.error('[productService] Erro ao obter última venda:', error);
    return null;
  }
}

// ============================================================================
// ALERTAS DE ESTOQUE
// ============================================================================

async function gerarAlertasEstoque(
  companyId: string,
  productId: string,
  estoqueAtual: number,
  product: Product,
): Promise<void> {
  try {
    const minimo = product.minimumStock || 0;
    const maximo = product.maximumStock || Infinity;

    // Limpar alertas anteriores deste produto
    const alertasAntigos = query(
      collection(db, 'alertas_estoque'),
      where('produtoId', '==', productId),
      where('lido', '==', false),
    );

    const alertasSnapshot = await getDocs(alertasAntigos);
    for (const alert of alertasSnapshot.docs) {
      await updateDoc(alert.ref, { lido: true });
    }

    // Gerar novo alerta se necessário
    let tipo: 'minimo' | 'maximo' | 'critico' | null = null;
    let urgencia: 'baixa' | 'media' | 'alta' = 'baixa';
    let descricao = '';

    if (estoqueAtual === 0) {
      tipo = 'critico';
      urgencia = 'alta';
      descricao = 'CRÍTICO: Estoque zerado!';
    } else if (estoqueAtual < minimo * 0.5) {
      tipo = 'critico';
      urgencia = 'alta';
      descricao = `Estoque crítico: ${estoqueAtual} un. (mínimo: ${minimo})`;
    } else if (estoqueAtual < minimo) {
      tipo = 'minimo';
      urgencia = 'media';
      descricao = `Abaixo do mínimo: ${estoqueAtual} un. (mínimo: ${minimo})`;
    } else if (estoqueAtual > maximo) {
      tipo = 'maximo';
      urgencia = 'baixa';
      descricao = `Acima do máximo: ${estoqueAtual} un. (máximo: ${maximo})`;
    }

    if (tipo) {
      await addDoc(collection(db, 'alertas_estoque'), {
        companyId,
        produtoId: productId,
        nomeProduto: product.name,
        tipo,
        descricao,
        estoqueAtual,
        valorMinimo: minimo,
        urgencia,
        lido: false,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('[productService] Erro ao gerar alertas:', error);
  }
}

export async function obterAlertas(
  companyId: string,
  naoLidos?: boolean,
): Promise<AlertaEstoque[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('companyId', '==', companyId),
    ];

    if (naoLidos) {
      constraints.push(where('lido', '==', false));
    }

    constraints.push(orderBy('urgencia', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(collection(db, 'alertas_estoque'), ...constraints);
    const querySnapshot = await getDocs(q);
    const alertas: AlertaEstoque[] = [];

    querySnapshot.forEach((doc) => {
      alertas.push({
        ...doc.data(),
        alertaId: doc.id,
      } as AlertaEstoque);
    });

    return alertas;
  } catch (error) {
    console.error('[productService] Erro ao obter alertas:', error);
    throw error;
  }
}

export async function marcarAlertaComoLido(alertaId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'alertas_estoque', alertaId), {
      lido: true,
    });
  } catch (error) {
    console.error('[productService] Erro ao marcar alerta como lido:', error);
    throw error;
  }
}

// ============================================================================
// RELATÓRIOS
// ============================================================================

export async function obterRelatorioEstoque(
  companyId: string,
): Promise<RelatorioEstoque[]> {
  try {
    const produtos = await getProductsByCompany(companyId);
    const relatorio: RelatorioEstoque[] = [];

    for (const product of produtos) {
      const estoqueAtual = product.currentStock || 0;
      const valorTotal = estoqueAtual * (product.costPrice || product.unitPrice);
      const margemLucro =
        product.costPrice && product.unitPrice
          ? ((product.unitPrice - product.costPrice) / product.costPrice) * 100
          : 0;

      let status: 'critico' | 'baixo' | 'normal' | 'excesso' = 'normal';
      const minimo = product.minimumStock || 0;
      const maximo = product.maximumStock || Infinity;

      if (estoqueAtual < minimo * 0.5) status = 'critico';
      else if (estoqueAtual < minimo) status = 'baixo';
      else if (estoqueAtual > maximo) status = 'excesso';

      relatorio.push({
        produtoId: product.productId,
        nomeProduto: product.name,
        estoqueAtual,
        estoqueMinimo: minimo,
        estoqueMaximo: maximo,
        precoCompra: product.costPrice || 0,
        precoVenda: product.unitPrice,
        valorTotalEstoque: valorTotal,
        margemLucro,
        status,
      });
    }

    // Ordenar por status de criticidade
    return relatorio.sort((a, b) => {
      const priorityMap = { critico: 0, baixo: 1, normal: 2, excesso: 3 };
      return (
        priorityMap[a.status as keyof typeof priorityMap] -
        priorityMap[b.status as keyof typeof priorityMap]
      );
    });
  } catch (error) {
    console.error('[productService] Erro ao gerar relatório de estoque:', error);
    throw error;
  }
}

export async function obterRelatorioProdutosMaisVendidos(
  companyId: string,
  dias: number = 30,
): Promise<RelatorioProdutosMaisVendidos[]> {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const q = query(
      collection(db, 'estoque_movimentacoes'),
      where('companyId', '==', companyId),
      where('tipo', '==', 'saida_venda'),
      orderBy('data', 'desc'),
    );

    const querySnapshot = await getDocs(q);
    const vendas = new Map<string, { quantidade: number; receita: number }>();

    querySnapshot.forEach((doc) => {
      const mov = doc.data() as MovimentacaoEstoque;
      const data = mov.data instanceof Date ? mov.data : new Date(mov.data);

      if (data >= dataLimite) {
        const atual = vendas.get(mov.produtoId) || {
          quantidade: 0,
          receita: 0,
        };
        vendas.set(mov.produtoId, {
          quantidade: atual.quantidade + mov.quantidade,
          receita: atual.receita + (mov.quantidade * (0 || mov.quantidade)), // Precisa estar na movimentação
        });
      }
    });

    const produtos = await getProductsByCompany(companyId);
    const relatorio: RelatorioProdutosMaisVendidos[] = [];
    let totalReceita = 0;

    vendas.forEach((venda) => {
      totalReceita += venda.receita;
    });

    vendas.forEach((venda, produtoId) => {
      const produto = produtos.find((p) => p.productId === produtoId);
      if (produto) {
        relatorio.push({
          produtoId,
          nomeProduto: produto.name,
          quantidadeVendida: venda.quantidade,
          receita: venda.receita,
          percentualReceita: totalReceita > 0 ? (venda.receita / totalReceita) * 100 : 0,
          ticket: venda.receita / (venda.quantidade || 1),
        });
      }
    });

    return relatorio.sort((a, b) => b.receita - a.receita);
  } catch (error) {
    console.error('[productService] Erro ao gerar relatório de vendas:', error);
    throw error;
  }
}

export async function obterRelatorioGiroEstoque(
  companyId: string,
): Promise<RelatorioGiroEstoque[]> {
  try {
    const produtos = await getProductsByCompany(companyId);
    const relatorio: RelatorioGiroEstoque[] = [];
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    for (const produto of produtos) {
      const q = query(
        collection(db, 'estoque_movimentacoes'),
        where('produtoId', '==', produto.productId),
        where('tipo', '==', 'saida_venda'),
      );

      const querySnapshot = await getDocs(q);
      let vendidos30Dias = 0;

      querySnapshot.forEach((doc) => {
        const mov = doc.data() as MovimentacaoEstoque;
        const data = mov.data instanceof Date ? mov.data : new Date(mov.data);
        if (data >= dataLimite) {
          vendidos30Dias += mov.quantidade;
        }
      });

      const estoqueAtual = produto.currentStock || 0;
      const giro = estoqueAtual > 0 ? vendidos30Dias / estoqueAtual : 0;
      const diasParaEsgotar = giro > 0 ? 30 / giro : Infinity;

      relatorio.push({
        produtoId: produto.productId,
        nomeProduto: produto.name,
        vendidoUltimos30Dias: vendidos30Dias,
        estoqueAtual,
        giroEstoque: giro,
        diasParaEsgotar: isFinite(diasParaEsgotar) ? Math.round(diasParaEsgotar) : 999,
      });
    }

    return relatorio.sort((a, b) => b.giroEstoque - a.giroEstoque);
  } catch (error) {
    console.error('[productService] Erro ao gerar relatório de giro:', error);
    throw error;
  }
}
