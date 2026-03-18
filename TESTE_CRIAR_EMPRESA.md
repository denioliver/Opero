# 🧪 Guia de Teste - Criar Empresa

## Correções Implementadas

✅ **Estrutura Multi-Tenant completa**

- Domain Modules criados em `/src/domains/`
- BaseEntity para herança consistente
- Firebase Service (companyService.ts)

✅ **Validações e Verificações**

- Função `checkUserHasCompany()` - corrigida para usar getDoc() direto
- Função `createCompany()` - agora cria empresa + subcoleções + registra usuário como admin
- Validação de usuário já tendo empresa

✅ **Correções de Código**

- CompanyRegister: Adicionado import de `validateCorporateEmail`
- CompanyRegister: Adicionado `checkCompanyExists` ao hook useCompany
- CompanyRegister: Corrigido objeto `address` para não incluir `complement` vazio
- CompanyContext: Console.logs para debug
- companyService.ts: Otimizado `checkUserHasCompany()` com getDoc() direto
- Removidos imports desnecessários (where, query, getDocs)

## 📋 Passo a Passo para Testar

### Pré-requisitos

- [ ] App Expo compilado sem erros (`npm start -- --clear`)
- [ ] Firebase console aberto em outra aba para verificar dados

### Teste 1: Criar Primeira Empresa

1. **Abra o app** e faça login com um email que ainda não tem empresa
   - Se não tem conta: Clique em "Não tem conta? Cadastre-se"
   - Email: `seu-email+test1@gmail.com`
   - Senha: `Senha123!`

2. **Você será direcionado para CompanyRegister**

3. **Preencha os dados básicos:**
   - CNPJ: `34.028.316/0001-86` (ou outro CNPJ válido)
   - Clique enter/blur: Dados devem ser preenchidos automaticamente
   - Valide se formatação apareça:
     - ✓ CNPJ: `34.028.316/0001-86`
     - ✓ Telefone: `(xx) xxxxx-xxxx`
     - ✓ CEP: `xxxxx-xxx`

4. **Clique em "Criar Empresa"**
   - ⏳ Deve mostrar loading spinner
   - ✅ Alerta: "Empresa cadastrada com sucesso!"

5. **Abra Firebase Console > Firestore**
   - Procure collection `empresas`
   - Verifique documento criado com:
     ```
     {
       name: "...",
       cnpj: "34028316000186",  // SEM formatação no BD
       phone: "...",
       email: "...",
       status: "active",
       userId: "seu-uid-aqui",
       createdAt: timestamp,
       updatedAt: timestamp
     }
     ```
   - Verifique subcoleções dentro da empresa:
     - `clientes/` (com \_placeholder)
     - `produtos/` (com \_placeholder)
     - `ordens_servico/` (com \_placeholder)
     - `usuarios/` (com seu usuário como admin)

### Teste 2: Tentar Criar Segunda Empresa

1. **Ainda logado, volte para CompanyRegister**
   - Ou saia e entre novamente

2. **Tente preencher novo CNPJ**
   - Novo CNPJ: `11.222.333/0001-81`

3. **Clique em "Criar Empresa"**
   - ❌ Deve mostrar erro: "Você já possui uma empresa cadastrada..."
   - Este é o comportamento **esperado** (1 empresa por usuário)

### Teste 3: Novo Usuário Cria Empresa Diferente

1. **Faça logout**
   - Menu → Logout (se existir) ou volte para Login

2. **Cadastre novo usuário**
   - Email: `seu-email+test2@gmail.com`
   - Senha: `Senha123!`

3. **Preencha e crie empresa com CNPJ diferente**
   - Empresa A (usuário 1): `34.028.316/0001-86`
   - Empresa B (usuário 2): `11.222.333/0001-81`

4. **Verifique Firebase:**
   - Devem existir 2 documentos em `empresas/`
   - Cada um com seu `userId` diferente
   - Dados isolados por tenant ✓

## 🐛 Se der erro...

### Console.logs para Verificar

Abra o console do app (Expo) e procure por:

```
[CompanyRegister] Iniciando registro de empresa...
[CompanyRegister] Dados da empresa:  { ... }
[CompanyContext] Registrando empresa para usuário: xxx
[companyService] Novo empresaId gerado: xxx
[CompanyContext] Empresa criada com ID: xxx
```

### Erros Comuns

| Erro                         | Causa                        | Solução                     |
| ---------------------------- | ---------------------------- | --------------------------- |
| "Usuário não autenticado"    | Usuário não logado           | Faça login primeiro         |
| "Você já possui uma empresa" | Esperado no 2º teste         | Teste com novo usuário      |
| Firebase error no batch      | Documento do user não existe | Verifique `/usuarios/{uid}` |
| Timeout                      | Slow network                 | Verifique conexão ou espere |

## ✅ Validação de Sucesso

- [ ] Primeira empresa criada com sucesso
- [ ] Dados aparecem no Firebase (empresas/{id})
- [ ] Subcoleções inicializadas
- [ ] Usuário registrado como admin
- [ ] Segundo usuário consegue criar empresa diferente
- [ ] Primeiro usuário não consegue criar segunda empresa
- [ ] Dados no BD estão sem formatação (apenas números)
- [ ] Display mostra dados formatados

## 🎉 Próximos Passos

Após validar este teste, continuaremos com:

1. **Dashboard** - Exibir dados da empresa
2. **Clientes** - CRUD completo
3. **Produtos** - CRUD com tipos
4. **Ordens de Serviço** - Fluxo de OS
5. **Notas Fiscais** - Integração fiscal

---

**Data de Criação:** 16 de março de 2026  
**Status:** ✅ Implementação Completa - Aguardando Teste
