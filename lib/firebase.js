import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// ──────────────────────────────────────────────
// REPLACE these with your Firebase project config
// Go to: Firebase Console > Project Settings > General > Your apps > Config
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ─── Auth Functions ───
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(result.user);
  return result.user;
}

export async function signUpWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await ensureUserDoc(result.user);
  return result.user;
}

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0],
      createdAt: serverTimestamp(),
      projectCount: 0,
    });
  }
}

// ─── Project CRUD ───
export async function saveProject(userId, project) {
  const projectId = project.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ref = doc(db, "users", userId, "projects", projectId);
  await setDoc(ref, {
    ...project,
    id: projectId,
    updatedAt: serverTimestamp(),
    createdAt: project.createdAt || serverTimestamp(),
  });
  return projectId;
}

export async function getProjects(userId) {
  const q = query(
    collection(db, "users", userId, "projects"),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProject(userId, projectId) {
  const ref = doc(db, "users", userId, "projects", projectId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteProject(userId, projectId) {
  await deleteDoc(doc(db, "users", userId, "projects", projectId));
}

// ─── Share a project (public read link) ───
export async function shareProject(userId, projectId) {
  const shareId = `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const project = await getProject(userId, projectId);
  if (!project) throw new Error("Project not found");

  await setDoc(doc(db, "shared_projects", shareId), {
    ...project,
    sharedBy: userId,
    sharedAt: serverTimestamp(),
  });
  return shareId;
}

export async function getSharedProject(shareId) {
  const ref = doc(db, "shared_projects", shareId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export { auth, db };
