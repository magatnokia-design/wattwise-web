// Firestore Database Service
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { db } from "./config";

export const firestoreService = {
  // Create document
  createDocument: async (collectionName, docId, data) => {
    await setDoc(doc(db, collectionName, docId), data);
  },

  // Add document (auto-generated ID)
  addDocument: async (collectionName, data) => {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  },

  // Get document
  getDocument: async (collectionName, docId) => {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    return docSnap.exists() ? docSnap.data() : null;
  },

  // Update document
  updateDocument: async (collectionName, docId, data) => {
    await updateDoc(doc(db, collectionName, docId), data);
  },

  // Delete document
  deleteDocument: async (collectionName, docId) => {
    await deleteDoc(doc(db, collectionName, docId));
  },

  // Get collection
  getCollection: async (collectionName) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Query collection
  queryCollection: async (collectionName, conditions = []) => {
    let q = collection(db, collectionName);
    
    conditions.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Real-time listener
  subscribeToDocument: (collectionName, docId, callback) => {
    return onSnapshot(doc(db, collectionName, docId), (doc) => {
      callback(doc.exists() ? doc.data() : null);
    });
  },

  // Real-time collection listener
  subscribeToCollection: (collectionName, callback) => {
    return onSnapshot(collection(db, collectionName), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  }
};