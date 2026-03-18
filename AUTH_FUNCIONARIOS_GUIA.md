# 🔐 Sistema de Autenticação e Funcionários - Documentação Técnica

## 📋 Visão Geral

O sistema de autenticação da Opero possui **dois níveis de usuários**:

### 1. **Usuários Globais** (Firebase Auth + Firestore)

- **Admin**: Gerencia toda a plataforma, visualiza todas as empresas
- **Users** (Proprietário): Dono de uma empresa, gerencia funcionários e dados da empresa

### 2. **Funcionários** (Firestore + Login Manual)

- Sem acesso ao Firebase Auth
- Login com nome + senha
- Pertence a uma empresa específica
- Tem qualificação/função definida
- Todas as ações são auditadas

---

## 🏗️ Estrutura do Banco de Dados

```
Firestore/
├── usuarios/
│   └── {userId}
│       ├── id: string (Firebase UID)
│       ├── email: string
│       ├── name: string
│       ├── role: "admin" | "users"
│       ├── empresaId: string? (apenas para users)
│       ├── ativo: boolean
│       ├── createdAt: Date
│       └── createdBy: string? (para admins criados)
│
└── empresas/
    └── {empresaId}/
        ├── companyId: string
        ├── userId: string (proprietário)
        ├── name: string
        ├── ... dados da empresa
        │
        ├── funcionarios/
        │   └── {funcionarioId}
        │       ├── id: string
        │       ├── empresaId: string
        │       ├── nome: string
        │       ├── senha: string (hash bcryptjs)
        │       ├── qualificacao: enum
        │       ├── email: string?
        │       ├── telefone: string?
        │       ├── ativo: boolean
        │       ├── createdAt: Date
        │       └── updatedAt: Date?
        │
        ├── clientes/
        │   └── {clienteId} ...
        │
        ├── produtos/
        │   └── {produtoId} ...
        │
        ├── ordens/
        │   └── {ordemId} ...
        │
        └── auditoria/
            └── {auditId}
                ├── id: string
                ├── empresaId: string
                ├── funcionarioId: string
                ├── funcionarioNome: string
                ├── qualificacao: string
                ├── acao: string (criar_cliente, editar_produto, etc)
                ├── colecao: string (clientes, produtos, etc)
                ├── documentoId: string
                ├── dados: object
                ├── mudancas: object? (antes/depois)
                └── criadoEm: Date
```

---

## 🔄 Fluxos de Autenticação

### Fluxo 1: Usuario Novo (Proprietário)

```
1. Signup Screen → email, password, name
   ↓
2. createUserWithEmailAndPassword() [Firebase Auth]
   ↓
3. criarUsuarioGlobal(uid, email, name, "users") [Firestore]
   ↓
4. Usuário pode fazer login
   ↓
5. Redireciona para CompanyRegister (criar empresa)
   ↓
6. Ao criar empresa, empresaId é salvo em usuarios.empresaId
```

### Fluxo 2: Login - Usuário Global (Admin ou Proprietário)

```
1. Login Screen → email, password
   ↓
2. signInWithEmailAndPassword() [Firebase Auth]
   ↓
3. onAuthStateChanged() dispara
   ↓
4. obterUsuarioGlobal(firebase.uid) → busca documento Firestore
   ↓
5. Verificar role:
   - role === "admin" → Dashboard Admin (listar empresas)
   - role === "users" → Dashboard Usuário (sua empresa)
   ↓
6. Se ativo === false → fazer logout (bloqueado)
```

### Fluxo 3: Login - Funcionário

```
1. Tela de Login Funcionário → nome, senha
   ↓
2. autenticarFuncionario(empresaId, nome, senha)
   ↓
3. Query: funcionarios where nome == "..." [Firestore]
   ↓
4. bcrypt.compare(senha, senhaHash)
   ↓
5. Se válido:
   - Configurar contexto FuncionarioContext
   - Armazenar sessão em RAM (não persiste)
   ↓
6. Acesso à empresa (ver clientes, criar ordens, etc)
   ↓
7. Cada ação registrada em auditoria (quem fez, função, data)
```

---

## 📱 Componentes e Contextos

### AuthContext

```typescript
interface AuthContextType {
  user: UserContexto | null; // Usuário global logado
  isLoading: boolean;
  isAuthenticated: boolean;
  login(email, password): Promise<void>;
  signup(email, password, name): Promise<void>;
  logout(): Promise<void>;
  error: string | null;
  clearError(): void;
}
```

**Mudanças importantes:**

- `signup()` agora não requer `company`
- Usuário é criado com `role: "users"`
- Sem persistência de sessão (sempre login manual)

### FuncionarioContext

```typescript
interface FuncionarioContextType {
  funcionario: FuncionarioContexto | null; // Sessão do funcionário
  isLoading: boolean;
  error: string | null;
  loginFuncionario(empresaId, nome, senha): Promise<void>;
  logoutFuncionario(): void;
  clearError(): void;
}
```

**Características:**

- Sessão em RAM (não persiste)
- Login com nome + senha
- Sem Firebase Auth

---

## 🎯 Qualificações de Funcionário

```typescript
type FuncionarioQualificacao =
  | "gerente_geral"
  | "gerente_tecnico"
  | "gerente_financeiro"
  | "vendedor"
  | "tecnico"
  | "administrativo"
  | "financeiro"
  | "outro";
```

---

## 📊 Auditoria

Cada ação de funcionário é registrada:

```typescript
interface AuditoriaLog {
  id: string;
  empresaId: string;
  funcionarioId: string;
  funcionarioNome: string; // Quem fez
  qualificacao: string; // Função
  acao: string; // O que fez
  colecao: string; // Em qual coleção
  documentoId: string; // Qual documento
  dados: object; // Dados relevantes
  mudancas?: object; // Antes/depois (para edições)
  criadoEm: Date; // Quando
}
```

### Exemplo de Auditoria

```
Funcionário: João Silva
Qualificação: gerente_tecnico
Ação: criar_cliente
Data: 2026-03-17 14:30:00
Dados: {
  nome: "Empresa ABC",
  tipo: "pj",
  documento: "12.345.678/0001-00"
}
```

### Como Autorizar com Auditoria

Qualquer criação/edição/deletion deve:

```typescript
import { criarClienteComAuditoria } from "../services/auditoria-examples";
import { useFuncionario } from "../contexts/FuncionarioContext";

const MyComponent = () => {
  const { funcionario } = useFuncionario();

  const handleCreate = async (dados) => {
    // Será registrado quem criou, quando, com que função
    await criarClienteComAuditoria(
      empresaId,
      funcionario, // Se vazio, não registra (proprietário direto = sem auditoria)
      dados,
    );
  };
};
```

---

## 🔐 Dashboard Admin

Mostra todas as empresas:

```typescript
// Admin Dashboard
interface EmpresadashboardItem {
  empresaId: string;
  nome: string;
  email: string;
  cnpj: string;
  proprietario: string;
  funcionarios: number;
  clientes: number;
  ativo: boolean;
}

// Ações disponíveis:
// - Ver detalhes
// - Bloquear/ativar
// - Deletar (permanente)
// - Ver auditoria da empresa
```

---

## 🏢 Dashboard Usuário (Proprietário)

Mostra apenas sua empresa:

```typescript
// Opções:
// - Gerenciar empresa (editar dados)
// - Gerenciar funcionários (criar, editar, deletar, bloquear)
// - Ver auditoria de ações (quem fez o quê)
// - Acesso normal aos clientes, produtos, ordens
```

---

## 👥 Dashboard de Acessos (Funcionários)

Proprietário gerencia funcionários:

```typescript
interface AcessoFuncionario {
  funcionarioId: string;
  nome: string;
  qualificacao: enum;
  email?: string;
  telefone?: string;
  ativo: boolean;
  criadoEm: Date;
}

// Para cada funcionário, proprietário pode:
// - Visualizar seus dados
// - Editar nome, qualificação, contatos
// - Alterar senha
// - Bloquear/desbloquear
// - Deletar
// - Ver auditoria dele
```

---

## 🔒 Segurança - Firestore Rules

Ver arquivo `FIRESTORE_RULES.txt` para as regras completas.

**Resumo:**

- Usuários só leem seus próprios dados
- Admins leem todos os usuários
- Proprietário gerencia sua empresa
- Funcionários só acessam dados da empresa deles
- Auditoria é read-only (escrita apenas backend)

---

## 📝 Passo a Passo: Implementar Auditoria em Novo Serviço

### 1. Adicionar funções ao serviço (ex: clientService.ts)

Exemplo já existe em `auditoria-examples.ts`

### 2. No componente, usar com auditoria

```typescript
import { useFuncionario } from "../contexts/FuncionarioContext";
import { criarClienteComAuditoria } from "../services/auditoria-examples";

export const ClientForm = () => {
  const { funcionario } = useFuncionario();
  const { company } = useCompany();

  const handleCreate = async (dados) => {
    const clienteId = await criarClienteComAuditoria(
      company.companyId,
      funcionario, // null se proprietário, ou objeto FuncionarioContexto
      dados,
    );
  };
};
```

### 3. Para proprietário, funcionario será null

- Ação não é registrada com nome do funcionário
- Ou registrar como "Proprietário"

---

## 🚀 Próximos Passos

1. ✅ Tipos definidos
2. ✅ Serviços criados
3. ✅ Contextos criados
4. ⏳ Telas a criar:
   - Dashboard Admin (listar empresas)
   - Tela de Acessos (gerenciar funcionários)
   - Login de Funcionário
   - Visualizador de Auditoria
5. ⏳ Integrar auditoria em todos os serviços
6. ⏳ Testar fluxos completos

---

## 📚 Referências Rápidas

- Tipos: `src/domains/auth/types.ts`
- Serviço de Usuários: `src/services/firebase/usuarioService.ts`
- Serviço de Funcionários: `src/services/firebase/funcionarioService.ts`
- Serviço de Auditoria: `src/services/firebase/auditoriaService.ts`
- AuthContext: `src/contexts/AuthContext.tsx` (atualizado)
- FuncionarioContext: `src/contexts/FuncionarioContext.tsx` (novo)
- Exemplos: `src/services/auditoria-examples.ts`
