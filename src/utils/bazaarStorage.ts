import { BazaarEvent } from '../types';
import { db, COLLECTIONS, syncCollectionToFirestore, saveDocToFirestore, deleteDocFromFirestore } from '../lib/firebase';
import { safeLocalStorageSet } from './storage';

export const DEFAULT_BAZAAR_EVENTS: BazaarEvent[] = [];

const BAZAAR_STORAGE_KEY = 'aqmarine_bazaar_events_v1';

export const DUMMY_BAZAAR_IDS = ['bz-rshs', 'bz-pvj', 'bz-hijabfest'];

export function filterOutDummyBazaars(events: BazaarEvent[]): BazaarEvent[] {
  if (!Array.isArray(events)) return [];
  return events.filter(e => {
    if (!e || !e.name) return false;
    const isDummyId = DUMMY_BAZAAR_IDS.includes(e.id);
    const isDummyName = e.name.toLowerCase().includes('bazaar rshs') || 
                        e.name.toLowerCase().includes('mall pvj') || 
                        e.name.toLowerCase().includes('hijab fest & muslimah expo');
    return !isDummyId && !isDummyName;
  });
}

export function getBazaarEvents(): BazaarEvent[] {
  const saved = localStorage.getItem(BAZAAR_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = filterOutDummyBazaars(parsed);
        if (cleaned.length !== parsed.length) {
          safeLocalStorageSet(BAZAAR_STORAGE_KEY, cleaned);
        }
        return cleaned;
      }
    } catch (e) {
      console.error('Error parsing bazaar events', e);
    }
  }
  return DEFAULT_BAZAAR_EVENTS;
}

export function saveBazaarEvents(events: BazaarEvent[]): void {
  const cleaned = filterOutDummyBazaars(events);
  safeLocalStorageSet(BAZAAR_STORAGE_KEY, cleaned);
  syncCollectionToFirestore(COLLECTIONS.BAZAARS, cleaned).catch(console.warn);
}

export function getActiveBazaar(): BazaarEvent {
  const events = getBazaarEvents();
  return events.find((e) => e.isActive) || events[0] || DEFAULT_BAZAAR_EVENTS[0];
}

export function addBazaarEvent(eventData: Omit<BazaarEvent, 'id' | 'createdAt'>): BazaarEvent[] {
  const events = getBazaarEvents();
  const newEvent: BazaarEvent = {
    ...eventData,
    id: `bz-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  let updated = events;
  if (newEvent.isActive) {
    // Unset other active status if this is set active
    updated = events.map((e) => ({ ...e, isActive: false }));
  }

  updated = [newEvent, ...updated];
  saveBazaarEvents(updated);
  saveDocToFirestore(COLLECTIONS.BAZAARS, newEvent).catch(console.warn);
  return updated;
}

export function updateBazaarEvent(updatedEvent: BazaarEvent): BazaarEvent[] {
  const events = getBazaarEvents();
  let updated = events.map((e) => {
    if (e.id === updatedEvent.id) {
      return updatedEvent;
    }
    if (updatedEvent.isActive && e.id !== updatedEvent.id) {
      return { ...e, isActive: false };
    }
    return e;
  });
  saveBazaarEvents(updated);
  saveDocToFirestore(COLLECTIONS.BAZAARS, updatedEvent).catch(console.warn);
  return updated;
}

export function deleteBazaarEvent(eventId: string): BazaarEvent[] {
  const events = getBazaarEvents();
  const filtered = events.filter((e) => e.id !== eventId);
  if (!filtered.some((e) => e.isActive) && filtered.length > 0) {
    filtered[0].isActive = true;
  }
  deleteDocFromFirestore(COLLECTIONS.BAZAARS, eventId).catch(console.warn);
  saveBazaarEvents(filtered);
  return filtered;
}

export function setActiveBazaarEvent(eventId: string): BazaarEvent[] {
  const events = getBazaarEvents();
  const updated = events.map((e) => ({
    ...e,
    isActive: e.id === eventId,
  }));
  saveBazaarEvents(updated);
  return updated;
}

