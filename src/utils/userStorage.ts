import { StoredUser, DEFAULT_USERS, AUTH_STORAGE_KEYS } from '../data/authData';
import { db, COLLECTIONS, saveDocToFirestore, deleteDocFromFirestore, syncCollectionToFirestore } from '../lib/firebase';
import { getDocs, collection } from 'firebase/firestore';
import { safeLocalStorageSet } from './storage';

export function getUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CUSTOM_USERS);
    if (!raw) {
      safeLocalStorageSet(AUTH_STORAGE_KEYS.CUSTOM_USERS, DEFAULT_USERS);
      syncCollectionToFirestore(COLLECTIONS.USERS, DEFAULT_USERS).catch(console.warn);
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Valid roles
      const validRoles = ['owner', 'admin'];
      let cleaned = parsed.filter(
        (u) => validRoles.includes(u.role) && u.username.toLowerCase() !== 'pusat' && u.username.toLowerCase() !== 'kasir'
      );

      let needsSave = cleaned.length !== parsed.length;

      // Ensure all DEFAULT_USERS exist in stored list (e.g. ceo_owner, admin)
      DEFAULT_USERS.forEach((defUser) => {
        const exists = cleaned.some(
          (u) => u.username.toLowerCase() === defUser.username.toLowerCase() || u.id === defUser.id
        );
        if (!exists) {
          cleaned.push(defUser);
          needsSave = true;
        }
      });

      if (needsSave) {
        safeLocalStorageSet(AUTH_STORAGE_KEYS.CUSTOM_USERS, cleaned);
      }
      return cleaned;
    }
    safeLocalStorageSet(AUTH_STORAGE_KEYS.CUSTOM_USERS, DEFAULT_USERS);
    return DEFAULT_USERS;
  } catch (err) {
    console.error('Failed to parse users from localStorage:', err);
    return DEFAULT_USERS;
  }
}

// Fetch users directly from Firestore Cloud to ensure HP and other devices get latest accounts
export async function fetchUsersFromCloud(): Promise<StoredUser[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (!snap.empty) {
      const cloudUsers: StoredUser[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as StoredUser;
        if (data && data.username) {
          cloudUsers.push(data);
        }
      });

      if (cloudUsers.length > 0) {
        // Merge with DEFAULT_USERS
        DEFAULT_USERS.forEach((defUser) => {
          if (!cloudUsers.some((u) => u.username.toLowerCase() === defUser.username.toLowerCase() || u.id === defUser.id)) {
            cloudUsers.push(defUser);
          }
        });

        safeLocalStorageSet(AUTH_STORAGE_KEYS.CUSTOM_USERS, cloudUsers);
        return cloudUsers;
      }
    }
  } catch (e) {
    console.warn('Could not fetch users directly from cloud, using local fallback:', e);
  }
  return getUsers();
}

export function saveUsers(users: StoredUser[]): void {
  try {
    safeLocalStorageSet(AUTH_STORAGE_KEYS.CUSTOM_USERS, users);
    syncCollectionToFirestore(COLLECTIONS.USERS, users).catch(console.warn);
  } catch (err) {
    console.error('Failed to save users to localStorage:', err);
  }
}

export function updateUser(userId: string, updatedData: Partial<StoredUser>): StoredUser[] {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return users;

  users[index] = {
    ...users[index],
    ...updatedData,
  };

  saveUsers(users);
  saveDocToFirestore(COLLECTIONS.USERS, users[index]).catch(console.warn);
  return users;
}

export function addUser(userData: Omit<StoredUser, 'id'> & { id?: string }): StoredUser[] {
  const users = getUsers();
  const newUser: StoredUser = {
    ...userData,
    id: userData.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  const updated = [...users, newUser];
  saveUsers(updated);
  saveDocToFirestore(COLLECTIONS.USERS, newUser).catch(console.warn);
  return updated;
}

export function deleteUser(userId: string): StoredUser[] {
  const users = getUsers();
  if (users.length <= 1) {
    return users;
  }
  const filtered = users.filter((u) => u.id !== userId);
  saveUsers(filtered);
  deleteDocFromFirestore(COLLECTIONS.USERS, userId).catch(console.warn);
  return filtered;
}

export function resetUsersToDefault(): StoredUser[] {
  saveUsers(DEFAULT_USERS);
  syncCollectionToFirestore(COLLECTIONS.USERS, DEFAULT_USERS).catch(console.warn);
  return DEFAULT_USERS;
}

