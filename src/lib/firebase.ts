import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  deleteDoc,
  enableIndexedDbPersistence,
  Firestore
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { 
  Product, 
  SaleTransaction, 
  StockTransfer, 
  StockAdjustment, 
  StoreOutlet, 
  SalesChannel, 
  BazaarEvent, 
  UserAccount 
} from '../types';

export const firebaseConfig = {
  projectId: firebaseConfigJson.projectId,
  appId: firebaseConfigJson.appId,
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (with databaseId support)
const databaseId = (firebaseConfigJson as any).firestoreDatabaseId;
export const db: Firestore = databaseId 
  ? getFirestore(app, databaseId) 
  : getFirestore(app);

// Enable offline persistence when supported
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported by browser');
      }
    });
  } catch (e) {
    // Ignore in unsupported environments
  }
}

// Collection References Names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  TRANSFERS: 'transfers',
  ADJUSTMENTS: 'adjustments',
  RESTOCKS: 'restocks',
  OUTLETS: 'outlets',
  CHANNELS: 'salesChannels',
  BAZAARS: 'bazaars',
  SUBCATEGORIES: 'subCategories',
  USERS: 'userAccounts',
};

// Real-time Cloud Sync Helpers
export const syncCollectionToFirestore = async <T extends { id: string }>(
  collectionName: string, 
  items: T[]
) => {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, JSON.parse(JSON.stringify(item)), { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error syncing collection ${collectionName} to Firestore:`, error);
    return false;
  }
};

export const saveDocToFirestore = async <T extends { id: string }>(
  collectionName: string, 
  item: T
) => {
  try {
    const docRef = doc(db, collectionName, item.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(item)), { merge: true });
    return true;
  } catch (error) {
    console.error(`Error saving doc ${item.id} to ${collectionName}:`, error);
    return false;
  }
};

export const deleteDocFromFirestore = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting doc ${docId} from ${collectionName}:`, error);
    return false;
  }
};

export const replaceAllInFirestore = async <T extends { id: string }>(
  collectionName: string, 
  items: T[]
) => {
  try {
    // Fetch all existing docs in collection to delete them cleanly
    const existingSnap = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    
    existingSnap.forEach((d) => {
      batch.delete(d.ref);
    });

    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, JSON.parse(JSON.stringify(item)));
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error replacing collection ${collectionName}:`, error);
    return false;
  }
};

export const clearCollectionInFirestore = async (collectionName: string) => {
  try {
    const existingSnap = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    existingSnap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error clearing ${collectionName} in Firestore:`, error);
    return false;
  }
};
