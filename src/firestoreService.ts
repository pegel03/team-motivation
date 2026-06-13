import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './firebase';
import { Team, Submission } from './types';


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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection Validation as requested by the Critical Constraint
export async function testConnection(): Promise<void> {
  if (!isFirebaseConfigured) {
    console.warn("Firestore is niet geconfigureerd; connectietest overgeslagen.");
    return;
  }
  const testPath = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration (offline or pending configuration).");
    }
  }
}

// 2. Seeding initial data to Firestore if completely empty (Disabled per developer request)
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Seeding completely disabled. Tests are written via Cypress custom setup.
}

// 3. Teams API functions
export async function saveTeamDoc(team: Team): Promise<void> {
  const path = `teams/${team.id}`;
  try {
    await setDoc(doc(db, 'teams', team.id), team);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTeamDoc(teamId: string): Promise<void> {
  const path = `teams/${teamId}`;
  try {
    await deleteDoc(doc(db, 'teams', teamId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 4. Submissions API functions
export async function addSubmissionDoc(submission: Submission, team: Team | null): Promise<void> {
  const path = `submissions/${submission.id}`;
  try {
    // Collect reader domains/emails to satisfy cost-optimized query rules
    const allowedViewerEmails = team
      ? Array.from(new Set([
          ...team.memberEmails.map(e => e.toLowerCase().trim()),
          ...team.teamAdminEmails.map(e => e.toLowerCase().trim())
        ]))
      : [];
      
    await setDoc(doc(db, 'submissions', submission.id), {
      ...submission,
      allowedViewerEmails
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSubmissionDoc(submissionId: string): Promise<void> {
  const path = `submissions/${submissionId}`;
  try {
    await deleteDoc(doc(db, 'submissions', submissionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 5. Auth API functions
export async function loginWithGoogle(): Promise<string | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user.email;
  } catch (error) {
    console.error("Google sign-in error:", error);
    return null;
  }
}

export async function loginWithEmailSimulated(email: string): Promise<void> {
  const password = "LogiusDemoPass123!";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (createErr: any) {
        console.error("Error creating demo user in Firebase:", createErr);
        if (createErr.code === 'auth/operation-not-allowed') {
          console.warn("Email/Password provider has not been enabled in the Firebase Console yet.");
        }
      }
    } else {
      console.error("Error signing in demo user in Firebase:", err);
    }
  }
}

export async function loginWithEmailAndRealPassword(email: string, password?: string): Promise<void> {
  const targetPassword = password || (email.toLowerCase().trim() === 'pegel03@gmail.com' ? 'Banaan01' : 'LogiusDemoPass123!');
  try {
    await signInWithEmailAndPassword(auth, email, targetPassword);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
      try {
        await createUserWithEmailAndPassword(auth, email, targetPassword);
      } catch (createErr: any) {
        console.error("Error auto-creating user in Firebase on login:", createErr);
        throw createErr;
      }
    } else {
      console.error("Error signing in user in Firebase:", err);
      throw err;
    }
  }
}

export async function registerWithEmailAndRealPassword(email: string, password?: string): Promise<void> {
  const targetPassword = password || "LogiusDemoPass123!";
  try {
    await createUserWithEmailAndPassword(auth, email, targetPassword);
  } catch (createErr: any) {
    console.error("Error registering user in Firebase:", createErr);
    throw createErr;
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Password reset error in Firebase:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
}
