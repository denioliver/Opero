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
  useWindowDimensions,
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
  HomePermissions,
} from "../../domains/auth/types";
import { useAuth } from "../../contexts/AuthContext";
import { useFuncionario } from "../../contexts/FuncionarioContext";
import { formatDateBRL } from "../../utils/formatters";
import { maskEmail, maskPhone } from "../../utils/privacy";

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

const DEFAULT_HOME_PERMISSIONS: HomePermissions = {
  cardFaturamento: true,
  cardAReceber: true,
  cardAPagar: true,
  cardLucro: true,
  cardEstoqueBaixo: true,
  atalhoNotasFiscais: true,
  atalhoContasReceber: true,
  atalhoContasPagar: true,
};

export const AcessosScreen: React.FC = () => {
  const { height: screenHeight } = useWindowDimensions();
  const dropdownMaxHeight = Math.max(
    180,
    Math.min(360, Math.floor(screenHeight * 0.4)),
  );

  const { company } = useCompany();
  const { user } = useAuth();
  const { funcionario } = useFuncionario();
  const isProprietario = user?.role === "users";
  const shouldMaskSensitiveData = !!funcionario?.readOnlyAccess;
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
  const [readOnlyAccess, setReadOnlyAccess] = useState(false);
  const [canAccessAdminCards, setCanAccessAdminCards] = useState(false);
  const [canAccessFinancialDashboard, setCanAccessFinancialDashboard] =
    useState(false);
  const [homePermissions, setHomePermissions] = useState<HomePermissions>(
    DEFAULT_HOME_PERMISSIONS,
  );
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    acessos: true,
    auditoria: true,
    relatorios: true,
  });
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [showQualificacaoOptions, setShowQualificacaoOptions] = useState(false);
  const [showAdminPermissionOptions, setShowAdminPermissionOptions] =
    useState(false);
  const [showHomePermissionOptions, setShowHomePermissionOptions] =
    useState(false);

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
    setReadOnlyAccess(false);
    setCanAccessAdminCards(false);
    setCanAccessFinancialDashboard(false);
    setHomePermissions(DEFAULT_HOME_PERMISSIONS);
    setAdminPermissions({ acessos: true, auditoria: true, relatorios: true });
    setShowQualificacaoOptions(false);
    setShowAdminPermissionOptions(false);
    setShowHomePermissionOptions(false);
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
      setReadOnlyAccess(!!funcionario.readOnlyAccess);
      setCanAccessAdminCards(!!funcionario.canAccessAdminCards);
      setCanAccessFinancialDashboard(
        funcionario.canAccessFinancialDashboard !== false,
      );
      setHomePermissions(
        funcionario.homePermissions || DEFAULT_HOME_PERMISSIONS,
      );
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

  const toggleHomePermission = (key: keyof HomePermissions) => {
    setHomePermissions((prev) => ({
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
          readOnlyAccess,
          canAccessAdminCards,
          canAccessFinancialDashboard,
          adminPermissions: canAccessAdminCards ? adminPermissions : {},
          homePermissions,
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
              readOnlyAccess,
              canAccessAdminCards,
              canAccessFinancialDashboard,
              adminPermissions: canAccessAdminCards ? adminPermissions : null,
              homePermissions,
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
          readOnlyAccess,
          canAccessAdminCards,
          canAccessFinancialDashboard,
          canAccessAdminCards ? adminPermissions : undefined,
          homePermissions,
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
              readOnlyAccess,
              canAccessAdminCards,
              canAccessFinancialDashboard,
              adminPermissions: canAccessAdminCards ? adminPermissions : null,
              homePermissions,
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
                    <Text style={styles.value}>
                      {shouldMaskSensitiveData
                        ? maskEmail(item.email)
                        : item.email}
                    </Text>
                  </View>
                )}
                {item.telefone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Telefone:</Text>
                    <Text style={styles.value}>
                      {shouldMaskSensitiveData
                        ? maskPhone(item.telefone)
                        : item.telefone}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Criado em:</Text>
                  <Text style={styles.value}>
                    {formatDateBRL(item.createdAt)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Modo:</Text>
                  <Text style={styles.value}>
                    {item.readOnlyAccess ? "Somente visualização" : "Completo"}
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
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Dashboard:</Text>
                  <Text style={styles.value}>
                    {item.canAccessFinancialDashboard !== false
                      ? "Permitido"
                      : "Sem acesso"}
                  </Text>
                </View>
                {item.canAccessFinancialDashboard !== false && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Visibilidade:</Text>
                    <Text style={styles.value}>
                      {(() => {
                        const perms = item.homePermissions;
                        if (!perms) return "Tudo liberado";
                        const hiddenCount = Object.values(perms).filter(
                          (value) => value === false,
                        ).length;
                        return hiddenCount === 0
                          ? "Tudo liberado"
                          : `${hiddenCount} item(ns) oculto(s)`;
                      })()}
                    </Text>
                  </View>
                )}
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
            <ScrollView style={styles.modalForm} nestedScrollEnabled>
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
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setShowQualificacaoOptions((prev) => !prev)}
                  disabled={isFormLoading}
                >
                  <Text style={styles.selectTriggerText}>
                    {QUALIFICACOES.find((q) => q.value === selectedQualificacao)
                      ?.label || "Selecione"}
                  </Text>
                  <Text style={styles.selectTriggerIcon}>
                    {showQualificacaoOptions ? "▴" : "▾"}
                  </Text>
                </TouchableOpacity>

                {showQualificacaoOptions && (
                  <ScrollView
                    style={[
                      styles.selectOptionsPanel,
                      { maxHeight: dropdownMaxHeight },
                    ]}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    persistentScrollbar
                    keyboardShouldPersistTaps="handled"
                  >
                    {QUALIFICACOES.map((qual) => (
                      <TouchableOpacity
                        key={qual.value}
                        style={[
                          styles.selectOption,
                          selectedQualificacao === qual.value &&
                            styles.selectOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedQualificacao(qual.value);
                          setShowQualificacaoOptions(false);
                        }}
                        disabled={isFormLoading}
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            selectedQualificacao === qual.value &&
                              styles.selectOptionTextActive,
                          ]}
                        >
                          {qual.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
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
                <Text style={styles.formLabel}>Modo de uso</Text>
                <TouchableOpacity
                  style={[
                    styles.permissionToggle,
                    readOnlyAccess
                      ? styles.permissionToggleActive
                      : styles.permissionToggleInactive,
                  ]}
                  onPress={() => setReadOnlyAccess((prev) => !prev)}
                  disabled={isFormLoading}
                >
                  <Text
                    style={[
                      styles.permissionToggleText,
                      readOnlyAccess
                        ? styles.permissionToggleTextActive
                        : styles.permissionToggleTextInactive,
                    ]}
                  >
                    {readOnlyAccess
                      ? "Somente visualização"
                      : "Acesso completo"}
                  </Text>
                </TouchableOpacity>
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

              {/* Acesso ao Dashboard Financeiro */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Dashboard Financeiro</Text>
                <TouchableOpacity
                  style={[
                    styles.permissionToggle,
                    canAccessFinancialDashboard
                      ? styles.permissionToggleActive
                      : styles.permissionToggleInactive,
                  ]}
                  onPress={() =>
                    setCanAccessFinancialDashboard((prev) => !prev)
                  }
                  disabled={isFormLoading}
                >
                  <Text
                    style={[
                      styles.permissionToggleText,
                      canAccessFinancialDashboard
                        ? styles.permissionToggleTextActive
                        : styles.permissionToggleTextInactive,
                    ]}
                  >
                    {canAccessFinancialDashboard ? "Permitido" : "Bloqueado"}
                  </Text>
                </TouchableOpacity>
              </View>

              {canAccessFinancialDashboard && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Itens visíveis na Home</Text>
                  <TouchableOpacity
                    style={styles.selectTrigger}
                    onPress={() =>
                      setShowHomePermissionOptions((prev) => !prev)
                    }
                    disabled={isFormLoading}
                  >
                    <Text style={styles.selectTriggerText}>
                      {showHomePermissionOptions
                        ? "Ocultar seleção"
                        : "Selecionar itens visíveis"}
                    </Text>
                    <Text style={styles.selectTriggerIcon}>
                      {showHomePermissionOptions ? "▴" : "▾"}
                    </Text>
                  </TouchableOpacity>

                  {showHomePermissionOptions && (
                    <ScrollView
                      style={[
                        styles.selectOptionsPanel,
                        { maxHeight: dropdownMaxHeight },
                      ]}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      persistentScrollbar
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.permissionsGrid}>
                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.cardFaturamento
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() =>
                            toggleHomePermission("cardFaturamento")
                          }
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.cardFaturamento
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Card Faturamento
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.cardAReceber
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() => toggleHomePermission("cardAReceber")}
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.cardAReceber
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Card A Receber
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.cardAPagar
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() => toggleHomePermission("cardAPagar")}
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.cardAPagar
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Card A Pagar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.cardLucro
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() => toggleHomePermission("cardLucro")}
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.cardLucro
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Card Lucro
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.cardEstoqueBaixo
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() =>
                            toggleHomePermission("cardEstoqueBaixo")
                          }
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.cardEstoqueBaixo
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Card Estoque baixo
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.atalhoNotasFiscais
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() =>
                            toggleHomePermission("atalhoNotasFiscais")
                          }
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.atalhoNotasFiscais
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Atalho Notas Fiscais
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.atalhoContasReceber
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() =>
                            toggleHomePermission("atalhoContasReceber")
                          }
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.atalhoContasReceber
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Atalho Contas a Receber
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.permissionChip,
                            homePermissions.atalhoContasPagar
                              ? styles.permissionChipOn
                              : styles.permissionChipOff,
                          ]}
                          onPress={() =>
                            toggleHomePermission("atalhoContasPagar")
                          }
                          disabled={isFormLoading}
                        >
                          <Text
                            style={[
                              styles.permissionChipText,
                              homePermissions.atalhoContasPagar
                                ? styles.permissionChipTextOn
                                : styles.permissionChipTextOff,
                            ]}
                          >
                            Atalho Contas a Pagar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  )}

                  <Text style={styles.permissionsHint}>
                    Desative os itens que o funcionário não deve visualizar na
                    Home.
                  </Text>
                </View>
              )}

              {/* Permissões por tela (quando permitido) */}
              {canAccessAdminCards && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Telas liberadas</Text>
                  <TouchableOpacity
                    style={styles.selectTrigger}
                    onPress={() =>
                      setShowAdminPermissionOptions((prev) => !prev)
                    }
                    disabled={isFormLoading}
                  >
                    <Text style={styles.selectTriggerText}>
                      {showAdminPermissionOptions
                        ? "Ocultar permissões"
                        : "Selecionar permissões"}
                    </Text>
                    <Text style={styles.selectTriggerIcon}>
                      {showAdminPermissionOptions ? "▴" : "▾"}
                    </Text>
                  </TouchableOpacity>

                  {showAdminPermissionOptions && (
                    <ScrollView
                      style={[
                        styles.selectOptionsPanel,
                        { maxHeight: dropdownMaxHeight },
                      ]}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      persistentScrollbar
                      keyboardShouldPersistTaps="handled"
                    >
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
                    </ScrollView>
                  )}

                  <Text style={styles.permissionsHint}>
                    Se desmarcar uma tela, ela não aparece no menu de
                    Administração.
                  </Text>
                </View>
              )}

              {/* Botões Ação (abaixo do formulário) */}
              <View style={styles.modalButtonsInline}>
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
                    <Text
                      style={[styles.modalBtnText, styles.modalBtnTextSave]}
                    >
                      {editingId ? "Atualizar" : "Criar"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    maxHeight: "74%",
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
  selectTrigger: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  selectTriggerText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    marginRight: 8,
    flexShrink: 1,
  },
  selectTriggerIcon: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  selectOptionsPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 8,
    zIndex: 50,
    elevation: 50,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  selectOptionActive: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  selectOptionTextActive: {
    color: "#1D4ED8",
    fontWeight: "600",
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
  modalButtonsInline: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 12,
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
