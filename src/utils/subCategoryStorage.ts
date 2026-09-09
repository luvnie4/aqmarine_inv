import { ProductCategory } from '../types';
import { db, COLLECTIONS, saveDocToFirestore } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeLocalStorageSet } from './storage';

export const DEFAULT_HIJAB_SUBCATS = [
  'Voal Premium',
  'Pashmina',
  'Segi Empat (Square)',
  'Bergo / Instan',
  'Khimar / Syar\'i',
  'Plisket',
  'Silk Shimmer',
];

export const DEFAULT_MUKENA_SUBCATS = [
  'Mukena Silk Sutra Premium',
  'Mukena Dewasa 2-in-1',
  'Mukena Rayon Renda',
  'Mukena Traveling Mini (Parasut)',
  'Mukena Terusan',
  'Mukena Bordir Mewah',
  'Mukena Anak',
];

const STORAGE_KEYS = {
  HIJAB: 'aqmarine_subcats_hijab_v1',
  MUKENA: 'aqmarine_subcats_mukena_v1',
};

export function getSubCategories(category: ProductCategory | string): string[] {
  const key = category === 'Mukena' ? STORAGE_KEYS.MUKENA : STORAGE_KEYS.HIJAB;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing subcategories', e);
    }
  }
  return category === 'Mukena' ? DEFAULT_MUKENA_SUBCATS : DEFAULT_HIJAB_SUBCATS;
}

export function saveSubCategories(category: ProductCategory | string, subcats: string[]): void {
  const key = category === 'Mukena' ? STORAGE_KEYS.MUKENA : STORAGE_KEYS.HIJAB;
  safeLocalStorageSet(key, subcats);
  
  const docId = category === 'Mukena' ? 'mukena' : 'hijab';
  saveDocToFirestore(COLLECTIONS.SUBCATEGORIES, {
    id: docId,
    category,
    subcategories: subcats,
    updatedAt: new Date().toISOString()
  }).catch(console.warn);
}

export function addSubCategory(category: ProductCategory | string, newSubcat: string): string[] {
  const current = getSubCategories(category);
  const trimmed = newSubcat.trim();
  if (!trimmed || current.includes(trimmed)) return current;
  const updated = [...current, trimmed];
  saveSubCategories(category, updated);
  return updated;
}

export function deleteSubCategory(category: ProductCategory | string, subcatToDelete: string): string[] {
  const current = getSubCategories(category);
  const updated = current.filter((s) => s !== subcatToDelete);
  saveSubCategories(category, updated);
  return updated;
}

export function resetSubCategoriesToDefault(category: ProductCategory | string): string[] {
  const defaults = category === 'Mukena' ? DEFAULT_MUKENA_SUBCATS : DEFAULT_HIJAB_SUBCATS;
  saveSubCategories(category, defaults);
  return defaults;
}

