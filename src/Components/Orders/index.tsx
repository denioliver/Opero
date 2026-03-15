import React, { useState } from 'react';
import { OrdersList } from './OrdersList';
import { ServiceOrder } from '../../types';

// Placeholder para OrderForm que será implementado depois
function OrderForm({ 
  order, 
  onSuccess, 
  onCancel 
}: { 
  order?: ServiceOrder;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  return (
    <OrdersList
      onSelectOrder={(selectedOrder) => {
        // Placeholder
      }}
      onAddNew={() => {
        // Placeholder
      }}
    />
  );
}

export function OrdersScreen() {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <OrderForm
        order={selectedOrder || undefined}
        onSuccess={() => {
          setShowForm(false);
          setSelectedOrder(null);
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedOrder(null);
        }}
      />
    );
  }

  return (
    <OrdersList
      onSelectOrder={(order) => {
        setSelectedOrder(order);
        setShowForm(true);
      }}
      onAddNew={() => {
        setSelectedOrder(null);
        setShowForm(true);
      }}
    />
  );
}
