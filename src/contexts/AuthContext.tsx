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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitora mudanças de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Usuário está logado
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Usuário',
            company: '', // Será preenchido do Firestore futuramente
          });
        } else {
          // Usuário saiu
          setUser(null);
        }
      } catch (err) {
        console.error('Erro ao processar mudança de autenticação:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O estado do usuário será atualizado pelo onAuthStateChanged listener
    } catch (err) {
      const errorCode = (err as any).code || 'unknown';
      const message = getErrorMessage(errorCode);
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, company: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // TODO: Salvar dados adicionais (name, company) no Firestore
      // const userRef = doc(db, 'users', result.user.uid);
      // await setDoc(userRef, { name, company });
    } catch (err) {
      const errorCode = (err as any).code || 'unknown';
      const message = getErrorMessage(errorCode);
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer logout';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
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
