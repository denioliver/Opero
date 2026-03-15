import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Login } from './src/Components/Login';
import { Home } from './src/Components/Home';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [forceShowContent, setForceShowContent] = useState(false);

  // Timeout para garantir que sai do loading após 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceShowContent(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const shouldShowLoading = isLoading && !forceShowContent;

  if (shouldShowLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFB' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: '#6B7280' }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <>
      {isAuthenticated ? <Home /> : <Login />}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
