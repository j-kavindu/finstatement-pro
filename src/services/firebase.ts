import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer, getDoc, setDoc, serverTimestamp, runTransaction
} from 'firebase/firestore';
// Configure your own Firebase project through Vite environment variables.
// Firebase web API keys are public identifiers; authorization is enforced by Firestore rules.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
// A valid-format placeholder permits the in-memory demo without a configured account.
if (!firebaseConfigured) Object.assign(firebaseConfig, { apiKey: 'demo-api-key', projectId: 'demo-finstatement', appId: 'demo-app-id' });
// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must pass firestoreDatabaseId
export const db = getFirestore(app);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Test connection on boot as mandated by Firestore guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently in offline mode or credentials need activation.');
    }
    return false;
  }
}

// Structured error handler as mandated by Firestore integration rules
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  console.error('Firestore operation failed', operationType);
  throw new Error('Cloud operation failed. Check your connection and access permissions.');
}

export async function loadWorkspace(uid: string) {
  const snapshot = await getDoc(doc(db, 'users', uid, 'workspaces', 'primary'));
  return snapshot.exists() ? snapshot.data() : null;
}
export async function saveWorkspace(uid: string, payload: any, expectedRevision: number): Promise<number> {
  if (new TextEncoder().encode(JSON.stringify(payload)).length > 900000) throw new Error('Workspace is too large for this MVP (900 KB). Export a backup; use a normalized database for larger ledgers.');
  const ref = doc(db, 'users', uid, 'workspaces', 'primary');
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const revision = snapshot.exists() ? snapshot.data().revision : 0;
    if (revision !== expectedRevision) throw new Error('Workspace changed in another session. Reload before saving.');
    const entries = (payload.auditLogs ?? []).slice(0, 100);
    const logRefs = entries.map((entry: any) => doc(db, 'users', uid, 'auditLogs', entry.id));
    const logDocuments = await Promise.all(logRefs.map((logRef: any) => transaction.get(logRef)));
    const next = revision + 1;
    transaction.set(ref, { payload: JSON.parse(JSON.stringify(payload)), revision: next, updatedAt: serverTimestamp() });
    entries.forEach((entry: any, index: number) => {
      if (!logDocuments[index].exists()) transaction.set(logRefs[index], { ...JSON.parse(JSON.stringify(entry)), actorId: uid, recordedAt: serverTimestamp() });
    });
    return next;
  });
}

// Authentication Helpers
export async function loginWithGoogle(): Promise<User> {
  if (!firebaseConfigured) throw new Error('Configure Firebase in .env.local to sign in');
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  if (!firebaseConfigured) throw new Error('Configure Firebase in .env.local to sign in');
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User> {
  if (!firebaseConfigured) throw new Error('Configure Firebase in .env.local to register');
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  if (!firebaseConfigured) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}
