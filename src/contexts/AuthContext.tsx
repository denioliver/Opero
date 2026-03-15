import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface User {
  id: string;
  email: string;
  name: string;
  company: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, company: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuário desabilitado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Este email já está registrado',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente mais tarde',
    'auth/invalid-credential': 'Email ou senha inválidos',
  };
  
  return errorMessages[errorCode] || 'Erro ao fazer login. Tente novamente.';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Monitora mudanças de autenticação do Firebase
  useEffect(() => {
    let isMounted = true;

    console.log('[AuthContext] Inicializando listener...');

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        if (!isMounted) {
          console.log('[AuthContext] Component desmontado, ignorando');
          return;
        }

        console.log('[AuthContext] onAuthStateChanged:', {
          logado: !!firebaseUser,
          email: firebaseUser?.email,
        });

        try {
          if (firebaseUser) {
            // Usuário logado
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Usuário',
              company: '',
            });
            // Se estava em login, marca como completo
            if (isLoginInProgress) {
              console.log('[AuthContext] Login concluído, setando isLoading=false');
              setIsLoading(false);
              setIsLoginInProgress(false);
            }
          } else {
            // Usuário deslogado
            setUser(null);
            setIsLoading(false);
            setIsLoginInProgress(false);
          }
          
          // Marca que já inicializou na primeira resposta
          if (!hasInitialized) {
            console.log('[AuthContext] Primeira resposta recebida');
            setHasInitialized(true);
          }
        } catch (err) {
          console.error('[AuthContext] Erro ao processar autenticação:', err);
          setIsLoading(false);
          setIsLoginInProgress(false);
        }
      },
      (err) => {
        console.error('[AuthContext] Erro no listener:', err);
        if (!hasInitialized) {
          setHasInitialized(true);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isLoginInProgress, hasInitialized]);

  const login = async (email: string, password: string) => {
    console.log('[AuthContext] Iniciando login com:', email);
    setIsLoading(true);
    setIsLoginInProgress(true);
    setError(null);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext] Login sucesso:', result.user.email);
      // isLoading será setado para false quando onAuthStateChanged disparar
    } catch (err) {
      const errorCode = (err as any).code || 'unknown';
      const message = getErrorMessage(errorCode);
      console.error('[AuthContext] Erro login:', errorCode, message);
      setError(message);
      setIsLoading(false);
      setIsLoginInProgress(false);
      throw new Error(message);
    }
  };

  const signup = async (email: string, password: string, name: string, company: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const errorCode = (err as any).code || 'unknown';
      const message = getErrorMessage(errorCode);
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }
  };

  const logout = async () => {
    console.log('[AuthContext] Executando logout');
    setIsLoading(true);
    setIsLoginInProgress(true);
    setError(null);

    try {
      await signOut(auth);
      console.log('[AuthContext] Logout sucesso');
      // isLoading será setado para false quando onAuthStateChanged disparar
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer logout';
      console.error('[AuthContext] Erro logout:', message);
      setError(message);
      setIsLoading(false);
      setIsLoginInProgress(false);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
