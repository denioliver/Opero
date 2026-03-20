/**
 * Tipos TypeScript para o Opero
 * Entidades principais: Company, Client, Product, Order, Invoice
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  companyId?: string; // Referência à empresa do usuário
  createdAt: Date;
}

export interface Company {
  companyId: string;
  userId: string; // ID do proprietário (Firebase)
  ownerName: string; // Nome completo do proprietário
  ownerEmail: string; // Email de acesso do proprietário (Firebase Auth)
  ownerDocument: string; // CPF do proprietário (referente ao CNPJ)
  name: string; // Razão social da empresa
  cnpj: string; // Único, necessário para notas fiscais
  phone: string;
  email: string; // Email da empresa (CNPJ)
  address: {
    street: string;
    number: string;
    complement?: string;
  };
  city: string;
  state: string; // UF
  zipCode: string;
  createdAt: any; // Timestamp do Firestore
  updatedAt: any; // Timestamp do Firestore
}

export interface Client {
  clientId: string;
  companyId: string; // A qual empresa pertence
  name: string;
  cpfCnpj: string; // Único dentro da empresa
  phone: string;
  email?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
  };
  city: string;
  state: string;
  zipCode: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductCategory = 'Produto' | 'Serviço';
export type UnidadeMedida = 'UN' | 'CX' | 'PCT' | 'M2' | 'KG' | 'L' | 'H' | 'M';
export type OrigemMercadoria = 'importacao' | 'nacional' | 'mista';
export type CategoriaFiscal = 'simples' | 'icms' | 'ipi' | 'iss' | 'isento';
export type ResponsavelReposicao = 'empresa' | 'funcionario';
export type StatusProduto = 'ativo' | 'inativo' | 'descontinuado';

export interface Product {
  productId: string;
  companyId: string;
  
  // Informações básicas
  name: string;
  description?: string;
  category: ProductCategory;
  
  // Unidade e medidas
  unit: UnidadeMedida;
  
  // Preços
  unitPrice: number; // Preço de venda
  costPrice?: number; // Preço de compra/custo
  
  // Estoque
  currentStock?: number;
  minimumStock?: number;
  maximumStock?: number;
  
  // Informações adicionais
  sku?: string;
  image?: string;
  
  // Fiscal
  originMerchandise?: OrigemMercadoria;
  hasTax?: boolean;
  taxCategory?: CategoriaFiscal;
  generatesInvoice?: boolean;
  additionalCost?: number; // Embalagem, frete, etc
  
  // Reposição
  replenishmentResponsible?: ResponsavelReposicao;
  
  // Status
  status: StatusProduto;
  active: boolean;
  
  // Auditoria
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'aberto'
  | 'faturado'
  | 'cancelado'
  | 'rascunho'
  | 'confirmada'
  | 'em_andamento'
  | 'concluida'
  | 'faturada';

export interface OrderItem {
  itemId: string;
  productId: string;
  productName?: string; // Cache para exibição
  quantity: number;
  unitPrice: number;
  subtotal: number; // quantity * unitPrice
}

export interface ServiceOrder {
  orderId: string;
  companyId: string;
  orderNumber: string; // Formato: OS-2026-0001
  clientId: string;
  clientName?: string; // Cache para exibição
  sellerId?: string;
  sellerName?: string;
  status: OrderStatus;
  issueDate: Date;
  scheduledDate?: Date;
  completionDate?: Date;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  observations?: string;
  originalTotalValue?: number;
  discountPercentApplied?: number;
  totalValue: number; // Soma de todos os subitens
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'rascunho' | 'enviada' | 'paga' | 'atrasada';

export interface Invoice {
  invoiceId: string;
  companyId: string;
  invoiceNumber: string; // Formato: NF-2026-0001
  orderId: string; // Referência à OS que gerou a NF
  clientId: string;
  clientName?: string; // Cache
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  items: OrderItem[]; // Cópia dos itens da OS para auditoria
  subtotal: number;
  taxes: number; // Future: ICMS, IPI, ISS
  discount: number;
  totalValue: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para errors e responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
