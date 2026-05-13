import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || 'ai-studio-applet-webapp-9ec8c',
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID && (import.meta as any).env.VITE_FIREBASE_DATABASE_ID !== '(default)' 
    ? (import.meta as any).env.VITE_FIREBASE_DATABASE_ID 
    : (firebaseConfigJson as any).firestoreDatabaseId && (firebaseConfigJson as any).firestoreDatabaseId !== '(default)'
      ? (firebaseConfigJson as any).firestoreDatabaseId
      : 'ai-studio-8d3ad350-98bc-4b55-a553-5780cc99ca3b'
};

// --- EMERGENCY DEBUG LOGS ---
console.log("--- FIREBASE CONNECTION DEBUG ---");
console.log("Project ID:", firebaseConfig.projectId);
console.log("Database ID Source:", firebaseConfig.firestoreDatabaseId);
console.log("API Key exists:", !!firebaseConfig.apiKey);
console.log("---------------------------------");

const app = initializeApp(firebaseConfig);

// Final Database ID resolution
const finalDbId = (firebaseConfig.firestoreDatabaseId === '(default)' || !firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '') 
  ? undefined 
  : firebaseConfig.firestoreDatabaseId;

console.log(`[Firebase] Connecting to Database: ${finalDbId || '(default)'}`);

// Modern Firestore initialization with persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, finalDbId);

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
