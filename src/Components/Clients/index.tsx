import React, { useState } from 'react';
import { ClientsList } from './ClientsList';
import { ClientForm } from './ClientForm';
import { Client } from '../../types';

export function ClientsScreen() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <ClientForm
        client={selectedClient || undefined}
        onSuccess={() => {
          setShowForm(false);
          setSelectedClient(null);
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedClient(null);
        }}
      />
    );
  }

  return (
    <ClientsList
      onSelectClient={(client) => {
        setSelectedClient(client);
        setShowForm(true);
      }}
      onAddNew={() => {
        setSelectedClient(null);
        setShowForm(true);
      }}
    />
  );
}
