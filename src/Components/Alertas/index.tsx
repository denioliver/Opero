import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useCompany } from "../../contexts/CompanyContext";
import { useProducts } from "../../contexts/ProductsContext";
import { useReceivables } from "../../contexts/ReceivablesContext";

type AlertaUI = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  lido: boolean;
  createdAt: Date;
  source: "sistema" | "estoque";
};

const toDate = (value: any): Date => {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

export function AlertasScreen() {
  const { company } = useCompany();
  const { alertas, loadAlertas } = useProducts();
  const { contasReceber, atualizarAtrasos } = useReceivables();
  const [systemAlerts, setSystemAlerts] = useState<AlertaUI[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSystemAlerts = async () => {
    if (!company?.companyId) return;
    setIsLoading(true);

    try {
      const q = query(
        collection(db, "alertas_sistema"),
        where("companyId", "==", company.companyId),
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          tipo: data.tipo || "financeiro",
          titulo: data.titulo || "Alerta",
          descricao: data.descricao || "",
          lido: !!data.lido,
          createdAt: toDate(data.createdAt),
          source: "sistema" as const,
        };
      });

      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSystemAlerts(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadAlertas(), atualizarAtrasos(), loadSystemAlerts()]).catch(
      console.error,
    );
  }, [company?.companyId]);

  const mergedAlerts = useMemo(() => {
    const estoqueAlerts: AlertaUI[] = alertas.map((item) => ({
      id: item.alertaId,
      tipo: item.tipo,
      titulo: "Estoque",
      descricao: item.descricao,
      lido: item.lido,
      createdAt: toDate(item.createdAt),
      source: "estoque",
    }));

    return [...systemAlerts, ...estoqueAlerts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [systemAlerts, alertas]);

  const handleMarkRead = async (item: AlertaUI) => {
    if (item.source !== "sistema") return;

    await updateDoc(doc(db, "alertas_sistema", item.id), {
      lido: true,
    });

    await loadSystemAlerts();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const totalAtrasado = contasReceber.filter(
    (item) => item.status === "atrasado",
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertas</Text>
        <Text style={styles.subtitle}>
          {mergedAlerts.filter((item) => !item.lido).length} não lidos •{" "}
          {totalAtrasado} atrasados
        </Text>
      </View>

      <FlatList
        data={mergedAlerts}
        keyExtractor={(item) => `${item.source}-${item.id}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              item.tipo.includes("critico") || item.tipo.includes("atrasado")
                ? styles.cardDanger
                : styles.cardNormal,
            ]}
            onPress={() => handleMarkRead(item)}
            disabled={item.source !== "sistema"}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.titulo}</Text>
              <Text style={styles.cardMeta}>{item.tipo}</Text>
            </View>
            <Text style={styles.cardDescription}>{item.descricao}</Text>
            <Text style={styles.cardTime}>
              {item.createdAt.toLocaleDateString("pt-BR")}{" "}
              {item.lido ? "• lido" : "• novo"}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  subtitle: { marginTop: 4, color: "#6B7280", fontSize: 12, fontWeight: "600" },
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  cardNormal: { borderColor: "#E5E7EB" },
  cardDanger: { borderColor: "#FCA5A5" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  cardMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  cardDescription: { fontSize: 13, color: "#374151" },
  cardTime: { fontSize: 11, color: "#9CA3AF" },
});
