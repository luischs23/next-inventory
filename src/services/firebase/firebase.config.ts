import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Activar persistencia offline con `initializeFirestore`
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

const storage = getStorage(app);
const auth = getAuth(app);

// Habilitar persistencia en Firebase Auth para mantener la sesión offline
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistencia de sesión activada.");
  })
  .catch((error) => {
    console.error("Error activando la persistencia de sesión:", error);
  });

export { db, storage, auth };
