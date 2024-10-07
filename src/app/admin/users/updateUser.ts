import { doc, updateDoc } from 'firebase/firestore';
import { db } from 'app/services/firebase/firebase.config';

export async function updateUserCompany(userId: string, companyId: string) {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      companyId: companyId
    });
    console.log('User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}