import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useClients } from '../../contexts/ClientsContext';
import { Client } from '../../types';

interface ClientsListProps {
  onSelectClient?: (client: Client) => void;
  onAddNew?: () => void;
}

export function ClientsList({ onSelectClient, onAddNew }: ClientsListProps) {
  const { clients, isLoadingClients, loadClients, deleteClient } = useClients();
  const [searchText, setSearchText] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchText.toLowerCase()) ||
    client.cpfCnpj.includes(searchText)
  );

  const handleDelete = (clientId: string, clientName: string) => {
    Alert.alert('Confirmar exclusão', `Deseja excluir o cliente "${clientName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(clientId);
          try {
            await deleteClient(clientId);
            Alert.alert('Sucesso', 'Cliente excluído com sucesso');
          } catch (error) {
            Alert.alert('Erro', 'Erro ao excluir cliente');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const renderClientItem = ({ item }: { item: Client }) => (
    <View style={styles.clientCard}>
      <TouchableOpacity
        style={styles.clientContent}
        onPress={() => onSelectClient?.(item)}
      >
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientSubtitle}>{item.cpfCnpj}</Text>
          <Text style={styles.clientPhone}>{item.phone}</Text>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      <View style={styles.clientActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onSelectClient?.(item)}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.clientId, item.name)}
          disabled={deleting === item.clientId}
        >
          {deleting === item.clientId ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
              Deletar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 Clientes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddNew}
        >
          <Text style={styles.addButtonText}>+ Novo Cliente</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou CPF/CNPJ"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {isLoadingClients ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText ? 'Nenhum cliente encontrado' : 'Você ainda não tem clientes cadastrados'}
          </Text>
          {!searchText && (
            <TouchableOpacity style={styles.emptyButton} onPress={onAddNew}>
              <Text style={styles.emptyButtonText}>Cadastrar Primeiro Cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClientItem}
          keyExtractor={(item) => item.clientId}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  clientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  clientSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#D1D5DB',
  },
  clientActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  editButton: {
    backgroundColor: '#F0F9FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRightWidth: 0,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
