import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import type {
  QueryConstraint,
  DocumentData,
  CollectionReference,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';

// Generic get document
export const getDocument = async <T = DocumentData>(
  collectionPath: string,
  docId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionPath, docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

// Generic get collection
export const getCollection = async <T = DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  const collectionRef = collection(db, collectionPath) as CollectionReference<DocumentData>;
  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

// Generic realtime listener
export const subscribeToDocument = <T = DocumentData>(
  collectionPath: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionPath, docId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as T);
    } else {
      callback(null);
    }
  });
};

// Generic collection listener
export const subscribeToCollection = <T = DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
): Unsubscribe => {
  const collectionRef = collection(db, collectionPath) as CollectionReference<DocumentData>;
  const q = query(collectionRef, ...constraints);
  
  return onSnapshot(q, (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    callback(data);
  });
};

// Helper: Build query constraints
export { where, orderBy, limit };