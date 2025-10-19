import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC7bXBsmuRTgOl4PPmacqDDdo069UJOWFY",
  authDomain: "connect-28ef7.firebaseapp.com",
  projectId: "connect-28ef7",
  storageBucket: "connect-28ef7.firebasestorage.app",
  messagingSenderId: "67831768105",
  appId: "1:67831768105:web:f1e82efe84c57479d96838",
  measurementId: "G-3NEB4VVLZ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export default app;