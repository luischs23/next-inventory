import {  collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase/firebase.config';

async function migrateCollection(collectionName: string) {
  console.log(`Starting migration of ${collectionName}...`);
  const snapshot = await getDocs(collection(db, collectionName));
  let migratedCount = 0;
  let skippedCount = 0;

  const batchSize = 500;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    if (data.companyId) {
      const newDocRef = doc(db, 'companies', data.companyId, collectionName, document.id);
      batch.set(newDocRef, data);
      batch.delete(document.ref);
      migratedCount++;
      batchCount++;

      if (batchCount === batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} for ${collectionName}`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    } else {
      console.warn(`Skipping ${collectionName} document ${document.id}: No companyId found`);
      skippedCount++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} for ${collectionName}`);
  }

  console.log(`${collectionName} migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
}

async function migrateData() {
  try {
    await migrateCollection('users');
    await migrateCollection('stores');
    await migrateCollection('warehouses');
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

migrateData().catch(console.error);