#!/usr/bin/env node

/**
 * Script para limpar dados do Firebase Firestore
 * Execute: node clearFirebase.js
 */

const admin = require('firebase-admin');

const serviceAccount = require('./.env.json'); // Você precisa gerar isso no Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'operadb-3747b',
});

const db = admin.firestore();

async function clearFirestore() {
  console.log('🗑️  Iniciando limpeza do Firestore...\n');

  const collections = ['companies', 'clients', 'products', 'orders', 'invoices'];

  for (const collectionName of collections) {
    try {
      const docs = await db.collection(collectionName).get();
      console.log(`📦 ${collectionName}: ${docs.size} documentos encontrados`);

      if (docs.size > 0) {
        const batch = db.batch();
        docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ ${collectionName}: Deletado com sucesso\n`);
      }
    } catch (error) {
      console.error(`❌ Erro ao deletar ${collectionName}:`, error.message);
    }
  }

  console.log('✨ Firestore limpo com sucesso!');
  process.exit(0);
}

clearFirestore().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
