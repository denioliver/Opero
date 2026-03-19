/**
 * AcessosScreen.tsx
 * Gerenciar funcionários da empresa (CRUD)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useCompany } from "../../contexts/CompanyContext";
import {
  criarFuncionario,
  listarFuncionarios,
  obterFuncionario,
  atualizarFuncionario,
  desativarFuncionario,
} from "../../services/firebase/funcionarioService";
import { registrarAuditoria } from "../../services/firebase/auditoriaService";
import {
  AdminPermissions,
  Funcionario,
  FuncionarioContexto,
  FuncionarioQualificacao,
} from "../../domains/auth/types";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";

const QUALIFICACOES: Array<{ label: string; value: FuncionarioQualificacao }> =
  [
    { label: "Gerente Geral", value: "gerente_geral" },
    { label: "Gerente Técnico", value: "gerente_tecnico" },
    { label: "Gerente Financeiro", value: "gerente_financeiro" },
    { label: "Vendedor", value: "vendedor" },
    { label: "Técnico", value: "tecnico" },
    { label: "Administrativo", value: "administrativo" },
    { label: "Financeiro", value: "financeiro" },
    { label: "Outro", value: "outro" },
  ];

export const AcessosScreen: React.FC = () => {
  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const isProprietario = user?.role === "users";
  const canAccessThisScreen =
    isProprietario ||
    (!!funcionario?.canAccessAdminCards &&
      (!funcionario.adminPermissions ||
        !!funcionario.adminPermissions.acessos));
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [selectedQualificacao, setSelectedQualificacao] =
    useState<FuncionarioQualificacao>("outro");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [canAccessAdminCards, setCanAccessAdminCards] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    acessos: true,
    auditoria: true,
    relatorios: true,
  });
  const [isFormLoading, setIsFormLoading] = useState(false);

  const getAuditActor = (): FuncionarioContexto | null => {
    if (funcionario) return funcionario;
    if (user && company) {
      return {
        funcionarioId: user.id,
        funcionarioNome: user.name || user.email,
        qualificacao: "outro",
        empresaId: company.companyId,
        canAccessAdminCards: true,
      };
    }
    return null;
  };

  useEffect(() => {
    if (company && canAccessThisScreen) {
      carregarFuncionarios();
    }
  }, [company, canAccessThisScreen]);

  if (!canAccessThisScreen) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: "#6B7280" }}>
          Você não tem permissão para acessar esta tela.
        </Text>
      </View>
    );
  }

  const carregarFuncionarios = async () => {
    if (!company) return;
    try {
      setIsLoading(true);
      const funcs = await listarFuncionarios(company.companyId);
      setFuncionarios(funcs);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar funcionários");
      console.error("[AcessosScreen] Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNome("");
    setSelectedQualificacao("outro");
    setEmail("");
    setTelefone("");
    setSenha("");
    setCanAccessAdminCards(false);
    setAdminPermissions({ acessos: true, auditoria: true, relatorios: true });
    setEditingId(null);
  };

  const handleOpenModal = (funcionario?: Funcionario) => {
    if (funcionario) {
      setEditingId(funcionario.id);
      setNome(funcionario.nome);
      setSelectedQualificacao(funcionario.qualificacao);
      setEmail(funcionario.email || "");
      setTelefone(funcionario.telefone || "");
      setSenha(""); // Não carrega senha anterior
      setCanAccessAdminCards(!!funcionario.canAccessAdminCards);
      setAdminPermissions(
        funcionario.adminPermissions || {
          acessos: true,
          auditoria: true,
          relatorios: true,
        },
      );
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const toggleAdminPermission = (key: keyof AdminPermissions) => {
    setAdminPermissions((prev) => ({
      ...prev,
      [key]: !prev?.[key],
    }));
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleCreateOrUpdate = async () => {
    if (!company || !nome.trim()) {
      Alert.alert("Erro", "Preencha o nome");
      return;
    }

    if (!editingId && !senha.trim()) {
      Alert.alert("Erro", "Preencha a senha para novo funcionário");
      return;
    }

    try {
      setIsFormLoading(true);

      if (editingId) {
        // Atualizar
        const dataUpdate: Partial<Funcionario> = {
          nome,
          qualificacao: selectedQualificacao,
          email: email || undefined,
          telefone: telefone || undefined,
          canAccessAdminCards,
          adminPermissions: canAccessAdminCards ? adminPermissions : {},
        };

        if (senha.trim()) {
          dataUpdate.senha = senha;
        }

        await atualizarFuncionario(company.companyId, editingId, dataUpdate);

        const actor = getAuditActor();
        if (actor) {
          await registrarAuditoria(
            company.companyId,
            actor,
            "editar_funcionario",
            "funcionarios",
            editingId,
            {
              funcionarioNome: nome,
              qualificacao: selectedQualificacao,
              canAccessAdminCards,
              adminPermissions: canAccessAdminCards ? adminPermissions : null,
            },
          );
        }
        Alert.alert("Sucesso", "Funcionário atualizado");
      } else {
        // Criar
        const newId = await criarFuncionario(
          company.companyId,
          nome,
          senha,
          selectedQualificacao,
          email || undefined,
          telefone || undefined,
          canAccessAdminCards,
          canAccessAdminCards ? adminPermissions : undefined,
        );

        const actor = getAuditActor();
        if (actor) {
          await registrarAuditoria(
            company.companyId,
            actor,
            "criar_funcionario",
            "funcionarios",
            newId,
            {
              funcionarioNome: nome,
              qualificacao: selectedQualificacao,
              canAccessAdminCards,
              adminPermissions: canAccessAdminCards ? adminPermissions : null,
            },
          );
        }
        Alert.alert("Sucesso", "Funcionário criado");
      }

      handleCloseModal();
      await carregarFuncionarios();
    } catch (error) {
      Alert.alert(
        "Erro",
        error instanceof Error
          ? error.message
          : "Erro ao processar funcionário",
      );
      console.error("[AcessosScreen] Erro:", error);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDesativar = async (funcionario: Funcionario) => {
    Alert.alert("Confirmar", `Desativar "${funcionario.nome}"?`, [
      { text: "Cancelar", onPress: () => {} },
      {
        text: "Desativar",
        onPress: async () => {
          try {
            if (company) {
              await desativarFuncionario(company.companyId, funcionario.id);

              const actor = getAuditActor();
              if (actor) {
                await registrarAuditoria(
                  company.companyId,
                  actor,
                  "desativar_funcionario",
                  "funcionarios",
                  funcionario.id,
                  {
                    funcionarioNome: funcionario.nome,
                  },
                );
              }

              await carregarFuncionarios();
              Alert.alert("Sucesso", "Funcionário desativado");
            }
          } catch (error) {
            Alert.alert("Erro", "Não foi possível desativar funcionário");
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Acessos e Funcionários</Text>
          <Text style={styles.subtitle}>Gerenciar acesso à empresa</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Total: <Text style={styles.infoBold}>{funcionarios.length}</Text>{" "}
          funcionário(s)
        </Text>
      </View>

      {/* Botão Criar */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => handleOpenModal()}
      >
        <Text style={styles.createBtnText}>Criar Novo Funcionário</Text>
      </TouchableOpacity>

      {/* Lista */}
      {funcionarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado</Text>
          <Text style={styles.emptySubtext}>
            Clique em "Criar Novo Funcionário" para começar
          </Text>
        </View>
      ) : (
        <FlatList
          data={funcionarios}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Header Card */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleSection}>
                  <Text style={styles.cardTitle}>{item.nome}</Text>
                  <Text style={styles.cardSubtitle}>
                    {QUALIFICACOES.find((q) => q.value === item.qualificacao)
                      ?.label || item.qualificacao}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    item.ativo ? styles.badgeAtivo : styles.badgeInativo,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {item.ativo ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={styles.cardContent}>
                {item.email && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{item.email}</Text>
                  </View>
                )}
                {item.telefone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Telefone:</Text>
                    <Text style={styles.value}>{item.telefone}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Criado em:</Text>
                  <Text style={styles.value}>
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Administração:</Text>
                  <Text style={styles.value}>
                    {item.canAccessAdminCards
                      ? (() => {
                          const perms = item.adminPermissions;
                          if (!perms) return "Permitido";
                          const allowed = [
                            perms.acessos ? "Acessos" : null,
                            perms.auditoria ? "Histórico" : null,
                            perms.relatorios ? "Relatórios" : null,
                          ].filter(Boolean) as string[];
                          return allowed.length > 0
                            ? `Permitido: ${allowed.join(", ")}`
                            : "Permitido";
                        })()
                      : "Sem acesso"}
                  </Text>
                </View>
              </View>

              {/* Botões */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnEdit]}
                  onPress={() => handleOpenModal(item)}
                >
                  <Text style={styles.actionBtnText}>Editar</Text>
                </TouchableOpacity>

                {item.ativo && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnDeactivate]}
                    onPress={() => handleDesativar(item)}
                  >
                    <Text style={styles.actionBtnText}>Desativar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal CRUD */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Editar Funcionário" : "Novo Funcionário"}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView style={styles.modalForm}>
              {/* Nome */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="João Silva"
                  value={nome}
                  onChangeText={setNome}
                  editable={!isFormLoading}
                />
              </View>

              {/* Qualificação */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Qualificação *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.qualificacaoList}>
                    {QUALIFICACOES.map((qual) => (
                      <TouchableOpacity
                        key={qual.value}
                        style={[
                          styles.qualBtn,
                          selectedQualificacao === qual.value &&
                            styles.qualBtnActive,
                        ]}
                        onPress={() => setSelectedQualificacao(qual.value)}
                        disabled={isFormLoading}
                      >
                        <Text
                          style={[
                            styles.qualBtnText,
                            selectedQualificacao === qual.value &&
                              styles.qualBtnTextActive,
                          ]}
                        >
                          {qual.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="joao@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  editable={!isFormLoading}
                />
              </View>

              {/* Telefone */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefone (opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChangeText={setTelefone}
                  editable={!isFormLoading}
                />
              </View>

              {/* Senha */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Senha {!editingId && "*"}
                  {editingId && "(deixe em branco para não alterar)"}
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                  editable={!isFormLoading}
                />
              </View>

              {/* Acesso a Administração */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Administração</Text>
                <TouchableOpacity
                  style={[
                    styles.permissionToggle,
                    canAccessAdminCards
                      ? styles.permissionToggleActive
                      : styles.permissionToggleInactive,
                  ]}
                  onPress={() =>
                    setCanAccessAdminCards((prev) => {
                      const next = !prev;
                      if (next) {
                        setAdminPermissions({
                          acessos: true,
                          auditoria: true,
                          relatorios: true,
                        });
                      }
                      return next;
                    })
                  }
                  disabled={isFormLoading}
                >
                  <Text
                    style={[
                      styles.permissionToggleText,
                      canAccessAdminCards
                        ? styles.permissionToggleTextActive
                        : styles.permissionToggleTextInactive,
                    ]}
                  >
                    {canAccessAdminCards ? "Permitido" : "Bloqueado"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Permissões por tela (quando permitido) */}
              {canAccessAdminCards && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Telas liberadas</Text>
                  <View style={styles.permissionsGrid}>
                    <TouchableOpacity
                      style={[
                        styles.permissionChip,
                        adminPermissions.acessos
                          ? styles.permissionChipOn
                          : styles.permissionChipOff,
                      ]}
                      onPress={() => toggleAdminPermission("acessos")}
                      disabled={isFormLoading}
                    >
                      <Text
                        style={[
                          styles.permissionChipText,
                          adminPermissions.acessos
                            ? styles.permissionChipTextOn
                            : styles.permissionChipTextOff,
                        ]}
                      >
                        Acessos
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.permissionChip,
                        adminPermissions.auditoria
                          ? styles.permissionChipOn
                          : styles.permissionChipOff,
                      ]}
                      onPress={() => toggleAdminPermission("auditoria")}
                      disabled={isFormLoading}
                    >
                      <Text
                        style={[
                          styles.permissionChipText,
                          adminPermissions.auditoria
                            ? styles.permissionChipTextOn
                            : styles.permissionChipTextOff,
                        ]}
                      >
                        Histórico
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.permissionChip,
                        adminPermissions.relatorios
                          ? styles.permissionChipOn
                          : styles.permissionChipOff,
                      ]}
                      onPress={() => toggleAdminPermission("relatorios")}
                      disabled={isFormLoading}
                    >
                      <Text
                        style={[
                          styles.permissionChipText,
                          adminPermissions.relatorios
                            ? styles.permissionChipTextOn
                            : styles.permissionChipTextOff,
                        ]}
                      >
                        Relatórios
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.permissionsHint}>
                    Se desmarcar uma tela, ela não aparece no menu de
                    Administração.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Botões Ação */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={handleCloseModal}
                disabled={isFormLoading}
              >
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleCreateOrUpdate}
                disabled={isFormLoading}
              >
                {isFormLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.modalBtnText, styles.modalBtnTextSave]}>
                    {editingId ? "Atualizar" : "Criar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 45,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#DBEAFE",
  },
  infoBox: {
    backgroundColor: "#DBEAFE",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  infoText: {
    fontSize: 13,
    color: "#1F2937",
  },
  infoBold: {
    fontWeight: "bold",
    color: "#2563EB",
  },
  createBtn: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  createBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeAtivo: {
    backgroundColor: "#DCFCE7",
  },
  badgeInativo: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    width: 80,
  },
  value: {
    fontSize: 12,
    color: "#1F2937",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  btnEdit: {
    backgroundColor: "#DBEAFE",
  },
  btnDeactivate: {
    backgroundColor: "#FEF3C7",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeBtn: {
    fontSize: 24,
    color: "#6B7280",
  },
  modalForm: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: "60%",
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
  },
  qualificacaoList: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  qualBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFF",
  },
  qualBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  qualBtnText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  qualBtnTextActive: {
    color: "#FFF",
  },
  permissionToggle: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  permissionToggleActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  permissionToggleInactive: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  permissionToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  permissionToggleTextActive: {
    color: "#1D4ED8",
  },
  permissionToggleTextInactive: {
    color: "#6B7280",
  },
  permissionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 8,
  },
  permissionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionChipOn: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  permissionChipOff: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  permissionChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  permissionChipTextOn: {
    color: "#1D4ED8",
  },
  permissionChipTextOff: {
    color: "#6B7280",
  },
  permissionsHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#F3F4F6",
  },
  modalBtnSave: {
    backgroundColor: "#2563EB",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalBtnTextSave: {
    color: "#FFF",
  },
});
