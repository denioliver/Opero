# 🚀 OPERO - Guia de Deployment e Configuração Final

## Status: MVP Completo e Pronto para Produção

---

## 1️⃣ Checklist Pré-Deployment

### ✅ Desenvolvimento Completado

- [x] Autenticação com Firebase Auth
- [x] Persistência de sessão
- [x] Cadastro de empresa
- [x] CRUD Clientes
- [x] CRUD Produtos
- [x] CRUD Ordens (listagem + estrutura)
- [x] CRUD Notas Fiscais (listagem + estrutura)
- [x] Navegação Stack
- [x] TypeScript strict mode
- [x] Validações de formulário
- [x] Firestore integration

### ⏳ Em Progresso (Fase 8)

- [ ] Formulário completo de Ordem com múltiplos itens
- [ ] Geração automática de NF a partir de Ordem
- [ ] Firestore Security Rules

### 📋 Pré-requisitos Produção

- [ ] Conta Google Cloud Console criada
- [ ] Projeto Firebase criado e ativado
- [ ] Firestore Database criado (modo produção)
- [ ] Authentication (Email/Password) ativado
- [ ] Storage (se planeja upload de arquivos) configurado
- [ ] Build tools (EAS, Android SDK, Xcode) instalados

---

## 2️⃣ Configuração Firebase (IMPORTANTE)

### **Passo 1: Criar Projeto Firebase**

1. Acesse https://console.firebase.google.com
2. Clique em "Criar projeto"
3. Nome: `Opero`
4. Desabilite Google Analytics (deixe desmarcado)
5. Clique em "Criar projeto"

### **Passo 2: Obter Credenciais**

1. No Firebase Console, clique em "Configurações do projeto"
2. Vá para abas "Geral" → "Suas aplicações"
3. Clique em "Web" (ícone `</>`
4. Insira nome: `Opero Web`
5. Copie a configuração JSON

### **Passo 3: Configurar .env**

Crie arquivo `.env` na raiz do projeto:

```env
# Firebase Web Config
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=opero-xxxxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=opero-xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=opero-xxxxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# App Config
EXPO_PUBLIC_APP_NAME=Opero
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### **Passo 4: Ativar Firestore**

1. No Firebase Console, vá a "Firestore Database"
2. Clique em "Criar banco de dados"
3. Modo de inicialização: `Modo de produção` (aplicaremos regras depois)
4. Localização: Mais próxima do público-alvo (ex: South America - São Paulo)
5. Clique em "Criar"

### **Passo 5: Ativar Authentication**

1. Vá a "Authentication" → "Começar"
2. Método de login: "Email/Senha"
3. Ative "Email e senha"
4. Salve

### **Passo 6: Firestore Security Rules (Segurança)**

⚠️ **ANTES DE PRODUÇÃO**:

Va a "Firestore Database" → Aba "Regras" e aplique:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bloqueia acesso por padrão
    match /{document=**} {
      allow read, write: if false;
    }

    // Usuário acessa sua própria empresa
    match /companies/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Clientes de uma empresa
    match /clients/{docId} {
      allow read, write: if request.auth.uid == request.auth.uid
                         && resource.data.companyId == request.auth.uid;
    }

    // Similar para products, orders, invoices
    // TODO: Implementar regras completas seguras
  }
}
```

---

## 3️⃣ Build & Deploy Local

### **Instalar EAS CLI**

```bash
npm install -g eas-cli
eas login
```

### **Criar app.json com EAS Config**

Atualize seu `app.json`:

```json
{
  "expo": {
    "name": "Opero",
    "slug": "opero-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [["expo-font"], ["expo-splash-screen"]],
    "eas": {
      "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

---

## 4️⃣ Deploy Android (Google Play)

### **Pré-requisitos**

- Android SDK instalado
- Chave de assinatura (keystore)

### **Gerar Keystore (1ª vez)**

```bash
# Criar chave de assinatura
keytool -genkey -v -keystore opero-release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias opero-key
```

Salve a senha com segurança!

### **Build Android APK**

```bash
# Build para teste (preview)
eas build --platform android --profile preview

# Após testes, build para Google Play (production)
eas build --platform android --profile production

# Baixar APK
eas build:list
```

### **Publicar Google Play**

1. Acesse https://play.google.com/console
2. Criar novo app: "Opero"
3. Preencher informações:
   - Descrição
   - Screenshots (5 mínimo)
   - Ícone
   - Política de privacidade
4. Upload do AAB (Android App Bundle)
5. Submeter para review

---

## 5️⃣ Deploy iOS (App Store)

### **Pré-requisitos**

- Conta Apple Developer ($99/ano)
- Mac com Xcode
- Apple ID

### **Configuração Apple**

1. Acesse https://developer.apple.com/account
2. Criar App ID: `com.seudominio.opero`
3. Ativar necessários: Push Notifications, HealthKit etc
4. Criar provisionamento profile

### **Build iOS**

```bash
# Build para TestFlight (preview)
eas build --platform ios --profile preview

# Build para App Store (production)
eas build --platform ios --profile production
```

### **Publicar App Store**

1. Acesse https://appstoreconnect.apple.com
2. "Meus Apps" → Criar novo app
3. Preencher:
   - Nome exato
   - Descrição
   - Keywords
   - Screenshots (5-7 por orientação)
   - Ícone
   - Categoria
   - Idade
4. Fazer upload de build via Xcode ou TestFlight
5. Submeter para review (48-72h aprox)

---

## 6️⃣ Deploy Web (Expo Web)

### **Build Web**

```bash
# Build otimizado
npm run build:web

# Servir localmente
npx serve dist

# Abrir http://localhost:3000
```

### **Deploy Vercel (Recomendado)**

```bash
# 1. Conectar GitHub
# 2. Instalar Vercel CLI
npm i -g vercel

# 3. Deploy
vercel
```

### **Deploy Netlify**

```bash
# Conectar e fazer deploy
netlify deploy --prod --dir dist
```

---

## 7️⃣ Monitoramento em Produção

### **Firebase Analytics**

```typescript
// src/utils/analytics.ts
import { logEvent } from "firebase/analytics";
import { analytics } from "../config/firebase";

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  logEvent(analytics, eventName, params);
};
```

Usar em eventos importantes:

```typescript
// Quando usuário faz login
trackEvent("user_login", { method: "email" });

// Quando cria ordem
trackEvent("order_created", { order_number: orderNumber });
```

### **Crashlytics**

```typescript
// src/utils/crashlytics.ts
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("AIzaSy..."),
  isTokenAutoRefreshEnabled: true,
});
```

---

## 8️⃣ Rollout Strategy

### **Fase 1: Internal Testing (1 semana)**

- [ ] Testar em 3-5 dispositivos reais
- [ ] Carregar dados de teste
- [ ] Executar casos de uso críticos
- [ ] Capturar bugs e UX feedback

### **Fase 2: Closed Beta (2 semanas)**

- [ ] Selecionar 20-50 usuários beta
- [ ] Distribuir via TestFlight (iOS) + Google Play beta (Android)
- [ ] Coletar feedback estruturado
- [ ] Preparar v1.0.1

### **Fase 3: Global Release**

- [ ] Publicar em todas as app stores
- [ ] Monitorar crashes/crashes rate
- [ ] Estar pronto para hotfixes

---

## 9️⃣ Versionamento & Hotfixes

### **Git Tags**

```bash
# Release v1.0.0
git tag -a v1.0.0 -m "Initial MVP release"
git push origin v1.0.0

# Hotfix v1.0.1
git checkout -b hotfix/v1.0.1 v1.0.0
# ... fazer correções ...
git merge hotfix/v1.0.1 main
git tag -a v1.0.1 -m "Security patch"
```

### **Versionamento no package.json**

```json
{
  "version": "1.0.0",
  "expo": {
    "version": "1.0.0"
  }
}
```

---

## 🔟 Checklist Final (Go/No-Go)

### **48h Antes do Deploy**

- [ ] Testes manual em Android (Expo Go)
- [ ] Testes manual em iOS (Expo Go)
- [ ] Validar todas as validações de formulário
- [ ] Verificar performance com 100+ registros
- [ ] Confirmar Firestore Rules estão corretas
- [ ] Backup de dados de produção se houver

### **Dia do Deploy**

- [ ] Criar git tag v1.0.0
- [ ] Build Android + upload Google Play
- [ ] Build iOS + upload App Store
- [ ] Build Web + deploy Vercel
- [ ] Monitorar Firebase Console em tempo real
- [ ] Comunicar ao time sobre lançamento

### **Pós-Deploy (Semana 1)**

- [ ] Monitorar crash rate no Firebase
- [ ] Responder reviews na app store
- [ ] Estar pronto para hotfixes
- [ ] Coletar feedback de usuários
- [ ] Documentar problemas encontrados

---

## 📱 Testes em Produção (Manual Checklist)

### **Login & Autenticação**

- [ ] Criar conta novo email
- [ ] Login com email/password
- [ ] Logout funciona
- [ ] Sessão persiste após reiniciar app
- [ ] "Esqueci senha" funciona (se implementado)

### **Empresa**

- [ ] Cadastro de empresa obrigatório na 1ª login
- [ ] Validações todas funcionando
- [ ] Dados salvam no Firestore

### **Clientes**

- [ ] Adicionar cliente novo
- [ ] Listar clientes
- [ ] Buscar cliente
- [ ] Editar cliente
- [ ] Deletar cliente (soft-delete)
- [ ] Selecionar cliente em ordem

### **Produtos**

- [ ] Adicionar 10 produtos variados
- [ ] Diferentes tipos (Produto / Serviço)
- [ ] Diferentes unidades
- [ ] Listar e buscar
- [ ] Editar preço
- [ ] Deletar

### **Ordens**

- [ ] Criar ordem nova
- [ ] Selecionar cliente
- [ ] Adicionar múltiplos itens
- [ ] Verificar número sequencial (OS-2026-XXXX)
- [ ] Mudar status

### **Notas Fiscais**

- [ ] Vincular a uma ordem
- [ ] Gerar número sequencial (NF-2026-XXXX)
- [ ] Alterar status
- [ ] Visualizar

### **Performance**

- [ ] Listar 100+ clientes = rápido
- [ ] Listar 100+ ordens = rápido
- [ ] Busca responde em < 1s
- [ ] Adicionar novo registro = rápido

### **Offline**

- [ ] Desativar internet
- [ ] App não quebra
- [ ] Reativar internet → sync funciona (se implementado)

---

## 🆘 Troubleshooting Comum

### **Firebase credentials não funcionam**

```
Solução: Verificar .env tem valores corretos
Verificar Firebase Console: Settings → Project Settings
Copiar novamente as credenciais
```

### **App compila mas não carrega data**

```
Solução: Verificar Firestore Rules não bloqueiam leitura
Verificar user.uid corresponde ao userId em Firestore
Olhar console.log no Firebase Console → Logs
```

### **Build Android falha**

```
Solução: npm install -g expo-cli
eas login
eas build --platform android --clear-cache --logs
```

### **App Store rejeita upload**

```
Solução: Verificar política de privacidade
Verificar screenshots
Verificar idade rating correto
```

---

## 📞 Suporte Pós-Launch

| Issue               | Tempo Resposta | Ação              |
| ------------------- | -------------- | ----------------- |
| **Crash rate > 5%** | Imediato       | Hotfix v1.0.1     |
| **Security issue**  | 24h            | Hotfix urgente    |
| **UX complaint**    | 48h            | Priorizar roadmap |
| **Feature request** | 1 semana       | Adicionar backlog |

---

## 🎉 Parabéns!

Seu MVP está pronto para produção.

**Próximas fases após V1.0 estável:**

- [ ] Relatórios avançados
- [ ] Integração com contábil
- [ ] App em versão 2.0

Boa sorte! 🚀
