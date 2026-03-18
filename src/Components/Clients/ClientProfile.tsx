/**
 * Perfil Completo do Cliente
 * Mostra dados, histórico de ordens e histórico financeiro
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Cliente } from "../../domains/clientes/types";
import { useClients } from "../../contexts/ClientsContext";

interface ClientProfileProps {
  clienteId: string;
  onBack?: () => void;
  onEdit?: (cliente: Cliente) => void;
}

export function ClientProfile({
  clienteId,
  onBack,
  onEdit,
}: ClientProfileProps) {
  const { clienteSelecionado, selectCliente, isLoading, error } = useClients();
  const [activeTab, setActiveTab] = useState<"dados" | "ordens" | "financeiro">(
    "dados",
  );

  useEffect(() => {
    selectCliente(clienteId).catch((err) => {
      console.error("[ClientProfile] Erro ao carregar:", err);
    });
  }, [clienteId, selectCliente]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  if (!clienteSelecionado) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cliente não encontrado</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cliente = clienteSelecionado;
  const tipoLabel = cliente.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica";
  const statusLabel = cliente.status === "ativo" ? "Ativo" : "Arquivado";
  const documentoLabel = cliente.tipo === "pf" ? "CPF" : "CNPJ";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backIconButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{cliente.nome}</Text>
            <Text style={styles.subtitle}>{tipoLabel}</Text>
          </View>
        </View>
        {onEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(cliente)}
          >
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusBadge}>{statusLabel}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dados" && styles.tabActive]}
          onPress={() => setActiveTab("dados")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "dados" && styles.tabTextActive,
            ]}
          >
            Dados
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ordens" && styles.tabActive]}
          onPress={() => setActiveTab("ordens")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "ordens" && styles.tabTextActive,
            ]}
          >
            Ordens
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "financeiro" && styles.tabActive]}
          onPress={() => setActiveTab("financeiro")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "financeiro" && styles.tabTextActive,
            ]}
          >
            Financeiro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "dados" && (
          <DadosTab cliente={cliente} documentoLabel={documentoLabel} />
        )}

        {activeTab === "ordens" && <OrdensTab clienteId={cliente.id} />}

        {activeTab === "financeiro" && <FinanceiroTab clienteId={cliente.id} />}
      </ScrollView>
    </View>
  );
}

function DadosTab({
  cliente,
  documentoLabel,
}: {
  cliente: Cliente;
  documentoLabel: string;
}) {
  return (
    <>
      {/* Informações Básicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Básicas</Text>

        <InfoRow label="Nome Completo" value={cliente.nome} />
        <InfoRow label={documentoLabel} value={cliente.documento} />
        <InfoRow label="Tipo" value={cliente.tipo === "pf" ? "PF" : "PJ"} />
      </View>

      {/* Contato */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contato</Text>

        {cliente.telefone ? (
          <InfoRow label="Telefone" value={cliente.telefone} />
        ) : (
          <Text style={styles.emptyField}>Telefone não informado</Text>
        )}

        {cliente.email ? (
          <InfoRow label="E-mail" value={cliente.email} />
        ) : (
          <Text style={styles.emptyField}>E-mail não informado</Text>
        )}
      </View>

      {/* Endereço */}
      {cliente.endereco && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <InfoRow
            label="Logradouro"
            value={`${cliente.endereco.rua}, ${cliente.endereco.numero}`}
          />
          <InfoRow
            label="Cidade"
            value={`${cliente.endereco.cidade}, ${cliente.endereco.estado}`}
          />
          <InfoRow label="CEP" value={cliente.endereco.cep} />
        </View>
      )}

      {/* Observações */}
      {cliente.observacoes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <View style={styles.observacoesBox}>
            <Text style={styles.observacoesText}>{cliente.observacoes}</Text>
          </View>
        </View>
      )}

      {/* Metadados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Sistema</Text>

        <InfoRow
          label="Data de Criação"
          value={
            cliente.createdAt instanceof Date
              ? cliente.createdAt.toLocaleDateString("pt-BR")
              : new Date(cliente.createdAt.toMillis()).toLocaleDateString(
                  "pt-BR",
                )
          }
        />

        {cliente.updatedAt && (
          <InfoRow
            label="Última Atualização"
            value={
              cliente.updatedAt instanceof Date
                ? cliente.updatedAt.toLocaleDateString("pt-BR")
                : new Date(cliente.updatedAt.toMillis()).toLocaleDateString(
                    "pt-BR",
                  )
            }
          />
        )}
      </View>
    </>
  );
}

function OrdensTab({ clienteId }: { clienteId: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Histórico de Ordens</Text>
      <View style={styles.emptyStateBox}>
        <Text style={styles.emptyStateText}>—</Text>
        <Text style={styles.emptyStateTitle}>Sem ordens registradas</Text>
        <Text style={styles.emptyStateDescription}>
          As ordens de serviço deste cliente aparecerão aqui
        </Text>
      </View>
    </View>
  );
}

function FinanceiroTab({ clienteId }: { clienteId: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Histórico Financeiro</Text>
      <View style={styles.emptyStateBox}>
        <Text style={styles.emptyStateText}>—</Text>
        <Text style={styles.emptyStateTitle}>Sem movimentações</Text>
        <Text style={styles.emptyStateDescription}>
          O histórico financeiro deste cliente aparecerá aqui
        </Text>
      </View>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backIconButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: "#2563EB",
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  editButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  emptyField: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  observacoesBox: {
    backgroundColor: "#F9FAFB",
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
  },
  observacoesText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  emptyStateBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  emptyStateDescription: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
  },
  backButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
