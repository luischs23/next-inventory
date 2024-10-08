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

async function migrateToCompanyStructure() {
  const serviceAccount = await loadServiceAccount();

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();

  // Create a new company document
  const companyRef = await db.collection('companies').add({
    name: 'Alepo',
    address: '8 estacion',
    email:"juan@gmail.com",
    phone:"3129392112"
  });

  const collections = ['stores', 'warehouses', 'users', 'products'];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    
    for (const doc of snapshot.docs) {
      await companyRef.collection(collectionName).doc(doc.id).set(doc.data());
      
      // If you want to delete the old documents, uncomment the next line
      // await doc.ref.delete();
    }

    console.log(`Migrated ${collectionName} collection`);
  }

  // Update user documents with companyId
  const usersSnapshot = await companyRef.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    await userDoc.ref.update({ companyId: companyRef.id });
  }

  console.log('Migration completed successfully');
}

migrateToCompanyStructure().catch(console.error);