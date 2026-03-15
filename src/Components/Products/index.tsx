import React, { useState } from 'react';
import { ProductsList } from './ProductsList';
import { ProductForm } from './ProductForm';
import { Product } from '../../types';

export function ProductsScreen() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <ProductForm
        product={selectedProduct || undefined}
        onSuccess={() => {
          setShowForm(false);
          setSelectedProduct(null);
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedProduct(null);
        }}
      />
    );
  }

  return (
    <ProductsList
      onSelectProduct={(product) => {
        setSelectedProduct(product);
        setShowForm(true);
      }}
      onAddNew={() => {
        setSelectedProduct(null);
        setShowForm(true);
      }}
    />
  );
}
