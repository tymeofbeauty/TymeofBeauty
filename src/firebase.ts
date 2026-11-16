import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { IndexedChunk, Language } from './utils/logic';

const DATABASE_ID =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  'ai-studio-bf493a3b-0404-42a1-a1c0-663c4fc88c33';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, DATABASE_ID);
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'consent',
});

// In-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function initAuth(
  onUserChanged: (user: User | null, accessToken: string | null) => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      onUserChanged(null, null);
      return;
    }
    if (!isSigningIn) {
      onUserChanged(user, cachedAccessToken);
    }
  });
}

export async function googleSignIn(): Promise<{
  user: User;
  accessToken: string | null;
} | null> {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken ?? null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearAccessToken(): void {
  cachedAccessToken = null;
}

export async function logout(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferredLanguage: Language;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

export interface ChatSessionRecord {
  id: string;
  userId: string;
  title: string;
  language: Language;
  messageCount: number;
  lastMessagePreview: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  sources: string[];
  createdAt?: Timestamp;
}

export interface UserMemoryRecord {
  id: string;
  userId: string;
  fact: string;
  category: 'preference' | 'goal' | 'beauty' | 'career' | 'partner';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DocChunkRecord extends IndexedChunk {
  userId: string;
  createdAt?: Timestamp;
}

export async function ensureUserProfile(user: User, preferredLanguage: Language): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDocFromServer(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: (user.displayName || user.email || 'Tyme User').slice(0, 120),
        email: (user.email || 'unknown@example.com').slice(0, 200),
        ...(user.photoURL ? { photoURL: user.photoURL.slice(0, 500) } : {}),
        preferredLanguage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: (user.displayName || user.email || 'Tyme User').slice(0, 120),
        email: (user.email || 'unknown@example.com').slice(0, 200),
        ...(user.photoURL ? { photoURL: user.photoURL.slice(0, 500) } : {}),
        preferredLanguage,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfileRecord | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDocFromServer(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfileRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserSpreadsheet(
  uid: string,
  spreadsheetId: string,
  spreadsheetUrl: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      spreadsheetId: spreadsheetId.slice(0, 150),
      spreadsheetUrl: spreadsheetUrl.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeSessions(
  uid: string,
  onData: (sessions: ChatSessionRecord[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${uid}/sessions`;
  const q = query(collection(db, 'users', uid, 'sessions'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as ChatSessionRecord);
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createSession(
  uid: string,
  title: string,
  language: Language
): Promise<string> {
  const sessionId = makeDocId('sess');
  const path = `users/${uid}/sessions/${sessionId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'sessions', sessionId), {
      id: sessionId,
      userId: uid,
      title: title.trim().slice(0, 120) || 'New Consultation',
      language,
      messageCount: 0,
      lastMessagePreview: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return sessionId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateSessionMeta(
  uid: string,
  sessionId: string,
  updates: {
    title?: string;
    language?: Language;
    messageCount: number;
    lastMessagePreview: string;
  }
): Promise<void> {
  const path = `users/${uid}/sessions/${sessionId}`;
  try {
    const payload: Record<string, unknown> = {
      messageCount: updates.messageCount,
      lastMessagePreview: updates.lastMessagePreview.slice(0, 200),
      updatedAt: serverTimestamp(),
    };
    if (updates.title) payload.title = updates.title.slice(0, 120);
    if (updates.language) payload.language = updates.language;
    await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  const path = `users/${uid}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeMessages(
  uid: string,
  sessionId: string,
  onData: (messages: ChatMessageRecord[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${uid}/sessions/${sessionId}/messages`;
  const q = query(
    collection(db, 'users', uid, 'sessions', sessionId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as ChatMessageRecord));
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addMessage(
  uid: string,
  sessionId: string,
  role: 'user' | 'model',
  content: string,
  sources: string[] = []
): Promise<string> {
  const messageId = makeDocId('msg');
  const path = `users/${uid}/sessions/${sessionId}/messages/${messageId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'sessions', sessionId, 'messages', messageId), {
      id: messageId,
      sessionId,
      userId: uid,
      role,
      content: content.slice(0, 32000),
      sources: sources.slice(0, 8).map((s) => s.slice(0, 200)),
      createdAt: serverTimestamp(),
    });
    return messageId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeMemories(
  uid: string,
  onData: (memories: UserMemoryRecord[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${uid}/memories`;
  const q = query(collection(db, 'users', uid, 'memories'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as UserMemoryRecord));
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addMemory(
  uid: string,
  fact: string,
  category: 'preference' | 'goal' | 'beauty' | 'career' | 'partner'
): Promise<string> {
  const memoryId = makeDocId('mem');
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'memories', memoryId), {
      id: memoryId,
      userId: uid,
      fact: fact.trim().slice(0, 500),
      category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return memoryId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteMemory(uid: string, memoryId: string): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'memories', memoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeDocChunks(
  uid: string,
  onData: (chunks: DocChunkRecord[]) => void,
  onError?: (err: Error) => void
) {
  const path = `users/${uid}/docChunks`;
  const q = query(collection(db, 'users', uid, 'docChunks'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as DocChunkRecord));
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveDocChunks(
  uid: string,
  documentId: string,
  documentTitle: string,
  chunks: Array<{ chunkIndex: number; content: string; embedding: number[] }>,
  existingChunkIdsForDoc: string[]
): Promise<void> {
  const basePath = `users/${uid}/docChunks`;
  try {
    // Delete previous chunks for this doc in batches, then insert new chunks
    const batch = writeBatch(db);
    for (const oldId of existingChunkIdsForDoc) {
      batch.delete(doc(db, 'users', uid, 'docChunks', oldId));
    }
    for (const chunk of chunks) {
      const chunkId = makeDocId('chk');
      batch.set(doc(db, 'users', uid, 'docChunks', chunkId), {
        id: chunkId,
        userId: uid,
        documentId: documentId.slice(0, 150),
        documentTitle: documentTitle.slice(0, 200),
        chunkIndex: chunk.chunkIndex,
        content: chunk.content.slice(0, 4000),
        embedding: chunk.embedding,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, basePath);
  }
}

export async function deleteDocChunksByIds(uid: string, chunkIds: string[]): Promise<void> {
  const basePath = `users/${uid}/docChunks`;
  try {
    const batch = writeBatch(db);
    for (const chunkId of chunkIds) {
      batch.delete(doc(db, 'users', uid, 'docChunks', chunkId));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, basePath);
  }
}

export async function saveContactSubmissionRecord(
  uid: string,
  data: {
    referenceId: string;
    fullName: string;
    email: string;
    phone: string;
    interest: string;
    preferredDate: string;
    notes: string;
    language: Language;
    spreadsheetId?: string;
    spreadsheetUrl?: string;
  }
): Promise<void> {
  const submissionId = makeDocId('sub');
  const path = `users/${uid}/submissions/${submissionId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'submissions', submissionId), {
      id: submissionId,
      userId: uid,
      referenceId: data.referenceId.slice(0, 64),
      fullName: data.fullName.slice(0, 120),
      email: data.email.slice(0, 200),
      phone: data.phone.slice(0, 30),
      interest: data.interest.slice(0, 80),
      preferredDate: data.preferredDate.slice(0, 40),
      notes: data.notes.slice(0, 1000),
      language: data.language,
      ...(data.spreadsheetId ? { spreadsheetId: data.spreadsheetId.slice(0, 150) } : {}),
      ...(data.spreadsheetUrl ? { spreadsheetUrl: data.spreadsheetUrl.slice(0, 500) } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
