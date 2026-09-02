import { StoreOutlet, SalesChannel } from '../types';
import { db, COLLECTIONS, syncCollectionToFirestore, saveDocToFirestore, deleteDocFromFirestore } from '../lib/firebase';

export const DEFAULT_OUTLETS: StoreOutlet[] = [
  {
    id: 'outlet-main',
    name: 'Toko Utama AQMARINE',
    code: 'TK-01',
    address: 'Jl. Riau No. 45, Bandung',
    phone: '0812-9988-7766',
    isDefault: true,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'outlet-2',
    name: 'Toko 2 AQMARINE (Cabang)',
    code: 'TK-02',
    address: 'Mall Paris Van Java / Ciwalk, Bandung',
    phone: '0813-8877-6655',
    isDefault: false,
    createdAt: '2026-08-02T00:00:00.000Z',
  },
];

export const DEFAULT_CHANNELS: SalesChannel[] = [
  {
    id: 'ch-toko',
    type: 'toko',
    name: 'Toko Offline',
    description: 'Penjualan langsung di toko fisik / outlet butik',
    isDefault: true,
  },
  {
    id: 'ch-bazaar',
    type: 'bazaar',
    name: 'Bazaar / Event',
    description: 'Pameran, festival hijab, pop-up booth, atau bazaar mall',
    isDefault: false,
  },
  {
    id: 'ch-wa',
    type: 'whatsapp',
    name: 'WhatsApp / Online',
    description: 'Pemesanan langsung via chat WhatsApp admin butik',
    isDefault: false,
  },
  {
    id: 'ch-shopee',
    type: 'custom',
    name: 'Shopee / Marketplace',
    description: 'Penjualan melalui marketplace online',
    isDefault: false,
  },
];

const STORAGE_KEYS = {
  OUTLETS: 'aqmarine_store_outlets_v1',
  CHANNELS: 'aqmarine_sales_channels_v1',
};

// --- Outlets (Toko Offline) ---

export function getOutlets(): StoreOutlet[] {
  const saved = localStorage.getItem(STORAGE_KEYS.OUTLETS);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing outlets', e);
    }
  }
  localStorage.setItem(STORAGE_KEYS.OUTLETS, JSON.stringify(DEFAULT_OUTLETS));
  syncCollectionToFirestore(COLLECTIONS.OUTLETS, DEFAULT_OUTLETS).catch(console.warn);
  return DEFAULT_OUTLETS;
}

export function saveOutlets(outlets: StoreOutlet[]): void {
  localStorage.setItem(STORAGE_KEYS.OUTLETS, JSON.stringify(outlets));
  syncCollectionToFirestore(COLLECTIONS.OUTLETS, outlets).catch(console.warn);
}

export function getDefaultOutlet(): StoreOutlet {
  const outlets = getOutlets();
  return outlets.find((o) => o.isDefault) || outlets[0] || DEFAULT_OUTLETS[0];
}

export function addOutlet(outletData: Omit<StoreOutlet, 'id' | 'createdAt'>): StoreOutlet[] {
  const outlets = getOutlets();
  const newOutlet: StoreOutlet = {
    ...outletData,
    id: `outlet-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // If new outlet is marked as default, unset other defaults
  let updated = outlets;
  if (newOutlet.isDefault) {
    updated = outlets.map((o) => ({ ...o, isDefault: false }));
  }

  updated = [...updated, newOutlet];
  saveOutlets(updated);
  saveDocToFirestore(COLLECTIONS.OUTLETS, newOutlet).catch(console.warn);
  return updated;
}

export function updateOutlet(updatedOutlet: StoreOutlet): StoreOutlet[] {
  const outlets = getOutlets();
  let updated = outlets.map((o) => {
    if (o.id === updatedOutlet.id) {
      return updatedOutlet;
    }
    // If updated is default, unset other defaults
    if (updatedOutlet.isDefault && o.id !== updatedOutlet.id) {
      return { ...o, isDefault: false };
    }
    return o;
  });
  saveOutlets(updated);
  saveDocToFirestore(COLLECTIONS.OUTLETS, updatedOutlet).catch(console.warn);
  return updated;
}

export function deleteOutlet(outletId: string): StoreOutlet[] {
  const outlets = getOutlets();
  if (outlets.length <= 1) {
    return outlets;
  }
  const filtered = outlets.filter((o) => o.id !== outletId);
  // Ensure at least one default
  if (!filtered.some((o) => o.isDefault) && filtered.length > 0) {
    filtered[0].isDefault = true;
  }
  saveOutlets(filtered);
  deleteDocFromFirestore(COLLECTIONS.OUTLETS, outletId).catch(console.warn);
  return filtered;
}

// --- Sales Channels (Kategori Saluran Penjualan) ---

export function getChannels(): SalesChannel[] {
  const saved = localStorage.getItem(STORAGE_KEYS.CHANNELS);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing channels', e);
    }
  }
  localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(DEFAULT_CHANNELS));
  syncCollectionToFirestore(COLLECTIONS.CHANNELS, DEFAULT_CHANNELS).catch(console.warn);
  return DEFAULT_CHANNELS;
}

export function saveChannels(channels: SalesChannel[]): void {
  localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
  syncCollectionToFirestore(COLLECTIONS.CHANNELS, channels).catch(console.warn);
}

export function addChannel(channelData: Omit<SalesChannel, 'id'>): SalesChannel[] {
  const channels = getChannels();
  const newChannel: SalesChannel = {
    ...channelData,
    id: `ch-${Date.now()}`,
  };

  let updated = channels;
  if (newChannel.isDefault) {
    updated = channels.map((c) => ({ ...c, isDefault: false }));
  }

  updated = [...updated, newChannel];
  saveChannels(updated);
  saveDocToFirestore(COLLECTIONS.CHANNELS, newChannel).catch(console.warn);
  return updated;
}

export function updateChannel(updatedChannel: SalesChannel): SalesChannel[] {
  const channels = getChannels();
  const updated = channels.map((c) => (c.id === updatedChannel.id ? updatedChannel : c));
  saveChannels(updated);
  saveDocToFirestore(COLLECTIONS.CHANNELS, updatedChannel).catch(console.warn);
  return updated;
}

export function deleteChannel(channelId: string): SalesChannel[] {
  const channels = getChannels();
  if (channels.length <= 1) {
    return channels;
  }
  const filtered = channels.filter((c) => c.id !== channelId);
  saveChannels(filtered);
  deleteDocFromFirestore(COLLECTIONS.CHANNELS, channelId).catch(console.warn);
  return filtered;
}
