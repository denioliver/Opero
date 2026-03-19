import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";

export const RelatoriosScreen: React.FC = () => {
  const { user } = useAuth();
  const { funcionario } = useFuncionario();

  const isProprietario = user?.role === "users";

  const canAccess = useMemo(() => {
    if (isProprietario) return true;
    if (!funcionario?.canAccessAdminCards) return false;

    const perms = funcionario.adminPermissions;
    if (!perms) return true; // compatibilidade com cadastros antigos

    return !!perms.relatorios;
  }, [funcionario, isProprietario]);

  if (!canAccess) {
    return (
      <View style={styles.center}>
        <Text style={styles.blockedTitle}>Acesso restrito</Text>
        <Text style={styles.blockedText}>
          Você não tem permissão para acessar Relatórios.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
        <Text style={styles.subtitle}>Resumo e indicadores</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Em desenvolvimento</Text>
          <Text style={styles.cardText}>
            Esta tela está pronta para receber os relatórios que você definir.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              Alert.alert(
                "Relatórios",
                "Me diga quais relatórios você quer ver aqui.",
              )
            }
          >
            <Text style={styles.btnText}>Definir relatórios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  header: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 45,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  body: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFB",
    padding: 16,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  blockedText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});
