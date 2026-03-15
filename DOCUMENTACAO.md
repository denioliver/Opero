# 🚀 Opero - Gestão de Empresas

## Visão Geral
App moderno e robusto para gestão de empresas com funcionalidades de ordens de serviço, cadastro de produtos, geração de OS e nota fiscal.

---

## 📂 Estrutura do Projeto

```
src/
├── Components/
│   ├── Login/
│   │   ├── index.tsx (Tela de Login)
│   │   └── styles.ts (Estilos do Login)
│   └── Home/
│       └── index.tsx (Tela Home - placeholder)
├── contexts/
│   └── AuthContext.tsx (Gerenciamento de autenticação)
└── utils/
    └── validation.ts (Funções de validação)
```

---

## 🎨 Tela de Login - Características

### ✨ Design & UX
- **Interface moderna e clean** com paleta de cores profissional (Azul #2563EB)
- **Responsivo** - adaptado para diferentes tamanhos de tela
- **Acessibilidade** - cores com bom contraste, inputs com labels claras
- **Feedback visual** - estados de focagem, erros e loading

### 🔐 Funcionalidades
- ✅ **Validação inteligente** de email e senha
- ✅ **Gestão de estado** com error handling
- ✅ **Loading state** com spinner
- ✅ **Checkbox "Lembrar-me"** (preparado para persistência)
- ✅ **Toggle de visibilidade de senha**
- ✅ **Responsividade com KeyboardAvoidingView**
- ✅ **Links para "Esqueceu a senha?" e "Criar conta"**

### 🎯 Detalhes de UX
1. **Validações em tempo real** - erros desaparecem ao digitar
2. **Inputs desabilitados durante loading** - evita múltiplas submissões
3. **Mensagens de erro claras** - guiam o usuário
4. **Focus states visuals** - borda azul e fundo claro
5. **Divider com "ou"** - prepara para próximos passos (social login, etc)

---

## 🔑 Contexto de Autenticação

### `AuthContext.tsx`
Gerencia:
- Estado do usuário (null ou dados)
- Loading state
- Erros
- Métodos: `login()`, `logout()`, `clearError()`
- Hook customizado: `useAuth()`

**Simulação**: Delay de 1.5s (substitua com chamada API real)

---

## ✔️ Validações

### Email
- Obrigatório
- Formato válido (regex)
- Mensagem de erro clara

### Senha
- Obrigatório
- Mínimo 6 caracteres
- Mensagem de erro clara

---

## 🚀 Próximos Passos Sugeridos

1. **Integração com API Real**
   - Substituir mock no `AuthContext.tsx` pela chamada real
   - Usar axios ou fetch

2. **Persistência de Dados**
   - Implementar AsyncStorage para "Lembrar-me"
   - Salvar token JWT

3. **Navegação**
   - Implementar React Navigation para múltiplas telas
   - Stack Navigator: Login → Home → Outros

4. **Telas Adicionais**
   - Dashboard Home
   - Gestão de Ordens de Serviço
   - Cadastro de Produtos
   - Geração de Documentos

5. **Melhorias**
   - Biometria (fingerprint/face)
   - Recuperação de senha
   - Signup com validações
   - Temas (light/dark mode)

---

## 💡 Padrões Utilizados

- **Composition Pattern** - componentes reutilizáveis
- **Context API** - gerenciamento de estado global
- **Custom Hooks** - `useAuth()` para fácil acesso
- **Validation Layer** - funções puras de validação
- **Clean Code** - TypeScript, comentários, tipos explícitos

---

## 📝 Como Usar

### Rodar o app
```bash
npm start
# ou
expo start
```

### Loginr com teste
- Email: qualquer@email.com
- Senha: qualquer coisa com 6+ caracteres

A autenticação é mockeada por enquanto. Para usar, substitua em `AuthContext.tsx`:
```typescript
// Trocar essa simulação pela chamada API real
```

---

## 🎉 Status
✅ **Estrutura escalável e robusta** pronta para expansão!
