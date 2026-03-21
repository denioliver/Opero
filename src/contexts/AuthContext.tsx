import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../config/firebase";
import { UserRole, UserContexto } from "../domains/auth/types";
import {
  obterUsuarioPorEmail,
  obterUsuarioGlobal,
  criarUsuarioGlobal,
} from "../services/firebase/usuarioService";

interface AuthContextType {
  user: UserContexto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  resetarNecessarioCriarPerfil: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_SESSION_STARTED_AT_KEY = "@opero:auth_session_started_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "auth/invalid-email": "Email inválido",
    "auth/user-disabled": "Usuário desabilitado",
    "auth/user-not-found": "Usuário não encontrado",
    "auth/wrong-password": "Senha incorreta",
    "auth/email-already-in-use": "Este email já está registrado",
    "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres)",
    "auth/operation-not-allowed": "Operação não permitida",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet",
    "auth/too-many-requests":
      "Muitas tentativas de login. Tente novamente mais tarde",
    "auth/invalid-credential": "Email ou senha inválidos",
  };

  return errorMessages[errorCode] || "Erro ao fazer login. Tente novamente.";
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserContexto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Monitora mudanças de autenticação do Firebase
  useEffect(() => {
    let isMounted = true;

    console.log("[AuthContext] Inicializando listener...");

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (!isMounted) {
          console.log("[AuthContext] Component desmontado, ignorando");
          return;
        }

        console.log("[AuthContext] onAuthStateChanged:", {
          logado: !!firebaseUser,
          email: firebaseUser?.email,
        });

        try {
          if (firebaseUser) {
            const rawStartedAt = await AsyncStorage.getItem(
              AUTH_SESSION_STARTED_AT_KEY,
            );
            const sessionStartedAt = Number(rawStartedAt);

            if (
              rawStartedAt &&
              !Number.isNaN(sessionStartedAt) &&
              Date.now() - sessionStartedAt > SESSION_MAX_AGE_MS
            ) {
              await signOut(auth);
              setUser(null);
              setError("Sessão expirada. Faça login novamente.");
              return;
            }

            if (!rawStartedAt) {
              await AsyncStorage.setItem(
                AUTH_SESSION_STARTED_AT_KEY,
                String(Date.now()),
              );
            }

            // Buscar dados globais do usuário
            const usuarioGlobal = await obterUsuarioGlobal(firebaseUser.uid);

            if (usuarioGlobal) {
              // Usuário logado e documento global existe
              if (!usuarioGlobal.ativo) {
                console.log("[AuthContext] Usuário desativado/bloqueado");
                await signOut(auth);
                setUser(null);
              } else {
                // Configurar usuário no contexto
                setUser({
                  id: firebaseUser.uid,
                  email: usuarioGlobal.email,
                  name: usuarioGlobal.name,
                  role: usuarioGlobal.role,
                  empresaId: usuarioGlobal.empresaId,
                });
              }
            } else {
              // Se não tem documento global, manter logado mas marcar como pendente
              console.log(
                "[AuthContext] Documento global não encontrado - pendente de criação",
              );
              // Manter usuário logado mas sinalar que precisa criar perfil
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: firebaseUser.displayName || "Usuário",
                necessarioCriarPerfil: true,
              });
            }
          } else {
            // Usuário deslogado
            setUser(null);
            await AsyncStorage.removeItem(AUTH_SESSION_STARTED_AT_KEY);
          }

          // Marca que já inicializou na primeira resposta
          if (!hasInitialized) {
            console.log("[AuthContext] Primeira resposta recebida");
            setHasInitialized(true);
          }

          // Finaliza qualquer estado de loading/login pendente
          setIsLoading(false);
          setIsLoginInProgress(false);
        } catch (err) {
          console.error("[AuthContext] Erro ao processar autenticação:", err);
          setIsLoading(false);
          setIsLoginInProgress(false);
        }
      },
      (err) => {
        console.error("[AuthContext] Erro no listener:", err);
        if (!hasInitialized) {
          setHasInitialized(true);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Dependência vazia - listener executa apenas uma vez ao montar

  const login = async (email: string, password: string) => {
    console.log("[AuthContext] Iniciando login com:", email);
    setIsLoading(true);
    setIsLoginInProgress(true);
    setError(null);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("[AuthContext] Login sucesso:", result.user.email);
      await AsyncStorage.setItem(
        AUTH_SESSION_STARTED_AT_KEY,
        String(Date.now()),
      );
      // isLoading será setado para false quando onAuthStateChanged disparar
    } catch (err) {
      const errorCode = (err as any).code || "unknown";
      const message = getErrorMessage(errorCode);
      console.error("[AuthContext] Erro login:", errorCode, message);
      setError(message);
      setIsLoading(false);
      // NÃO fazer setIsLoginInProgress(false) aqui!
      // Manter true para evitar que onAuthStateChanged cause re-render
      // O erro limpa automaticamente quando usuário digita novamente
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Criar documento global do usuário com role "users" (proprietário)
      await criarUsuarioGlobal(
        result.user.uid,
        email,
        name,
        "users", // Nova role para proprietários
      );

      await AsyncStorage.setItem(
        AUTH_SESSION_STARTED_AT_KEY,
        String(Date.now()),
      );

      console.log("[AuthContext] Usuário registrado com sucesso");
    } catch (err) {
      const errorCode = (err as any).code || "unknown";
      const message = getErrorMessage(errorCode);
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }
  };

  const logout = async () => {
    console.log("[AuthContext] Executando logout");
    setIsLoading(true);
    setIsLoginInProgress(true);
    setError(null);

    try {
      await signOut(auth);
      await AsyncStorage.removeItem(AUTH_SESSION_STARTED_AT_KEY);
      console.log("[AuthContext] Logout sucesso");
      // isLoading será setado para false quando onAuthStateChanged disparar
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao fazer logout";
      console.error("[AuthContext] Erro logout:", message);
      setError(message);
      setIsLoading(false);
      setIsLoginInProgress(false);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const resetarNecessarioCriarPerfil = () => {
    if (user) {
      console.log("[AuthContext] Resetando necessarioCriarPerfil para false");
      setUser({
        ...user,
        necessarioCriarPerfil: false,
      });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    error,
    clearError,
    resetarNecessarioCriarPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};
