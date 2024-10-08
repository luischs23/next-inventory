import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadServiceAccount() {
  const serviceAccountPath = join(__dirname, '..', 'services', 'firebase', 'serviceAccountKey.json');
  console.log('Attempting to load service account from:', serviceAccountPath);
  try {
    const serviceAccountContent = await readFile(serviceAccountPath, 'utf-8');
    return JSON.parse(serviceAccountContent);
  } catch (error) {
    console.error('Error loading service account:', error);
    throw error;
  }
}

async function migrateSubcollections() {
  const serviceAccount = await loadServiceAccount();

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();

  // Get all companies
  const companiesSnapshot = await db.collection('companies').get();

  for (const companyDoc of companiesSnapshot.docs) {
    const companyId = companyDoc.id;
    console.log(`Migrating subcollections for company: ${companyId}`);

    // Migrate stores and their subcollections
    const storesSnapshot = await db.collection(`companies/${companyId}/stores`).get();
    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id;
      console.log(`Migrating subcollections for store: ${storeId}`);

      // Migrate invoices
      await migrateSubcollection(db, `stores/${storeId}/invoices`, `companies/${companyId}/stores/${storeId}/invoices`);

      // Migrate savedInvoices
      await migrateSubcollection(db, `stores/${storeId}/savedInvoices`, `companies/${companyId}/stores/${storeId}/savedInvoices`);

      // Migrate products
      await migrateSubcollection(db, `stores/${storeId}/products`, `companies/${companyId}/stores/${storeId}/products`);
    }

    // Migrate warehouses and their subcollections
    const warehousesSnapshot = await db.collection(`companies/${companyId}/warehouses`).get();
    for (const warehouseDoc of warehousesSnapshot.docs) {
      const warehouseId = warehouseDoc.id;
      console.log(`Migrating subcollections for warehouse: ${warehouseId}`);

      // Migrate boxes
      await migrateSubcollection(db, `warehouses/${warehouseId}/boxes`, `companies/${companyId}/warehouses/${warehouseId}/boxes`);

      // Migrate products
      await migrateSubcollection(db, `warehouses/${warehouseId}/products`, `companies/${companyId}/warehouses/${warehouseId}/products`);
    }
  }

  console.log('Subcollections migration completed successfully');
}

async function migrateSubcollection(db: FirebaseFirestore.Firestore, sourcePath: string, destinationPath: string) {
  const sourceSnapshot = await db.collection(sourcePath).get();
  let batch = db.batch();
  let count = 0;

  for (const doc of sourceSnapshot.docs) {
    const destRef = db.doc(`${destinationPath}/${doc.id}`);
    batch.set(destRef, doc.data());
    count++;

    if (count >= 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`Migrated ${sourceSnapshot.size} documents from ${sourcePath} to ${destinationPath}`);
}

migrateSubcollections().catch(console.error);