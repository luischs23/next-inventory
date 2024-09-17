import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBHSqxCqn6fNNgx_w0E5xCIigGMSW3lLwc",
  authDomain: "next-inventory-fd1a6.firebaseapp.com",
  projectId: "next-inventory-fd1a6",
  storageBucket: "next-inventory-fd1a6.appspot.com",
  messagingSenderId: "264895563403",
  appId: "1:264895563403:web:8420edaade06ab8485368e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage,auth };