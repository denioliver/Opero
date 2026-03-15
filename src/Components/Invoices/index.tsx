import React from 'react';
import { InvoicesList } from './InvoicesList';
import { Invoice } from '../../types';

export function InvoicesScreen() {
  const handleSelectInvoice = (invoice: Invoice) => {
    // Implementar detalhes da NF no futuro
  };

  return (
    <InvoicesList
      onSelectInvoice={handleSelectInvoice}
    />
  );
}
