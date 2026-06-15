import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { 
  getFirestore, 
  enableNetwork, 
  disableNetwork,
  onSnapshot,
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfigJson from "../firebase-applet-config.json";

// Safe config resolver supporting production environment variables
const isClientEnv = typeof import.meta !== "undefined" && (import.meta as any).env;
const clientEnv = isClientEnv ? (import.meta as any).env : {};

// If JSON project configuration is provided, use it as the source of truth to prevent mixing credentials
const finalProjectId = firebaseConfigJson.projectId || clientEnv.VITE_FIREBASE_PROJECT_ID || "maazim-cafe";

// Only use client environment override if it doesn't conflict with our target project ID
const useEnv = clientEnv.VITE_FIREBASE_PROJECT_ID === finalProjectId || !firebaseConfigJson.projectId;

const firebaseConfig = {
  apiKey: (useEnv && clientEnv.VITE_FIREBASE_API_KEY) || firebaseConfigJson.apiKey || "",
  authDomain: (useEnv && clientEnv.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfigJson.authDomain || "",
  projectId: finalProjectId,
  storageBucket: (useEnv && clientEnv.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfigJson.storageBucket || "",
  messagingSenderId: (useEnv && clientEnv.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfigJson.messagingSenderId || "",
  appId: (useEnv && clientEnv.VITE_FIREBASE_APP_ID) || firebaseConfigJson.appId || "",
  measurementId: (useEnv && clientEnv.VITE_FIREBASE_MEASUREMENT_ID) || firebaseConfigJson.measurementId || "",
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || (useEnv && clientEnv.VITE_FIREBASE_DATABASE_ID) || "(default)"
};

// Initialize Firebase App safely with custom name to avoid conflicts
const appName = "Maazim-Cafe";
const app = getApps().some(a => a.name === appName)
  ? getApp(appName)
  : initializeApp(firebaseConfig, appName);

// Initialize Services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

// Connectivity simulation using real SDK operations
export async function setFirestoreOnline(online: boolean) {
  if (online) {
    await enableNetwork(db);
  } else {
    await disableNetwork(db);
  }
}

// Error handling in strict compliance with the Firebase Integration Skill (OperationType and FirestoreErrorInfo)
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to quickly test Firestore availability
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
