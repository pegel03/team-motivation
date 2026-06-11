/// <reference types="vite/client" />

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if Firebase variables are properly configured
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.startsWith('AIza') && 
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('your-real') &&
  !firebaseConfig.projectId.includes('your-app')
);

let dbInstance: any = null;
let authInstance: any = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const rawDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
    const trimmedDbId = rawDatabaseId?.trim() || '';
    const databaseId = (trimmedDbId === '' || trimmedDbId.toLowerCase() === 'default' || trimmedDbId === '(default)')
      ? undefined
      : trimmedDbId;
    dbInstance = getFirestore(app, databaseId);
    authInstance = getAuth(app);
  } catch (error) {
    console.error("Fout bij het initialiseren van Firebase:", error);
  }
}

// Create a robust fallback proxy/mock so the application won't crash on load
const dummyAuth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
    // Deliver null active user safely
    setTimeout(() => callback(null), 0);
    return () => {};
  },
  currentUser: null
};

const dummyDb = new Proxy({}, {
  get(target, prop) {
    return () => {
      console.warn(`Firebase is niet geconfigureerd. Handeling "${String(prop)}" genegeerd op dummy DB.`);
      return {};
    };
  }
});

export const db = isFirebaseConfigured ? dbInstance : dummyDb;
export const auth = isFirebaseConfigured ? authInstance : dummyAuth;
