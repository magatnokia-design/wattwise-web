import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import type { User, UserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

// Email normalization helper
const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Register new user
export const registerUser = async (
  email: string,
  password: string,
  name: string
): Promise<UserCredential> => {
  const normalizedEmail = normalizeEmail(email);
  
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );

  // Create user profile in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email: normalizedEmail,
    name: name.trim(),
    electricityRate: 12.0, // Default PHP per kWh
    monthlyBudget: 1000, // Default PHP
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    preferences: {
      notifications: true,
      autoShutdown: true,
      theme: 'light',
    },
  });

  return userCredential;
};

// Login user
export const loginUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  const normalizedEmail = normalizeEmail(email);
  return signInWithEmailAndPassword(auth, normalizedEmail, password);
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  return signOut(auth);
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);
  return sendPasswordResetEmail(auth, normalizedEmail);
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Check if user exists by email (calls Cloud Function)
export const checkUserExists = async (email: string): Promise<boolean> => {
  const normalizedEmail = normalizeEmail(email);
  try {
    const userQuery = await getDoc(doc(db, 'users', normalizedEmail));
    return userQuery.exists();
  } catch {
    return false;
  }
};