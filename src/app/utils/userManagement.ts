import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from 'app/services/firebase/firebase.config';

export async function moveUserToCompany(userId: string, companyId: string) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    
    // Create a new user document in the company's users subcollection
    await setDoc(doc(db, 'companies', companyId, 'users', userId), userData);

    // Delete the old user document
    await deleteDoc(userRef);

    console.log('User moved to company successfully');
  } else {
    console.error('User not found');
  }
}