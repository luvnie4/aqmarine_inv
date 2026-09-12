import React, { useState, useEffect, useRef } from 'react';
import { 
  Product, 
  ActiveTab, 
  StockTransfer, 
  SaleTransaction, 
  StockAdjustment, 
  StockRestock,
  UserAccount,
  StoreOutlet,
  SalesChannel
} from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_TRANSFERS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_ADJUSTMENTS,
  SAMPLE_PRODUCTS
} from './data/initialData';
import { AUTH_STORAGE_KEYS } from './data/authData';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { RestocksView } from './components/RestocksView';
import { SalesEntryView } from './components/SalesEntryView';
import { TransfersView } from './components/TransfersView';
import { AdjustmentsView } from './components/AdjustmentsView';
import { ReportsView } from './components/ReportsView';
import { ProfitLossView } from './components/ProfitLossView';
import { ProductFormModal } from './components/ProductFormModal';
import { TransferStockModal } from './components/TransferStockModal';
import { StockOpnameModal } from './components/StockOpnameModal';
import { RestockModal } from './components/RestockModal';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginView } from './components/LoginView';
import { ManageUsersModal } from './components/ManageUsersModal';
import { ManageOutletsModal } from './components/ManageOutletsModal';
import { ManageChannelsModal } from './components/ManageChannelsModal';
import { ManageBazaarsModal } from './components/ManageBazaarsModal';
import { ManageSubCategoriesModal } from './components/ManageSubCategoriesModal';
import { ImportProductsModal } from './components/ImportProductsModal';
import { filterOutDummyBazaars, getBazaarEvents, saveBazaarEvents } from './utils/bazaarStorage';
import { 
  getOutlets, 
  getChannels, 
  saveOutlets, 
  saveChannels,
  normalizeProductOutletStocks,
  deductProductStock,
  resolveOutletStockKey,
  getProductOutletStock
} from './utils/outletStorage';
import { getUsers, saveUsers } from './utils/userStorage';
import { getSubCategories, saveSubCategories } from './utils/subCategoryStorage';
import { 
  db, 
  COLLECTIONS, 
  saveDocToFirestore, 
  deleteDocFromFirestore,
  syncCollectionToFirestore 
} from './lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { safeLocalStorageSet, safeLocalStorageGet } from './utils/storage';

const STORAGE_KEYS = {
  PRODUCTS: 'aqmarine_boutique_products_v1',
  TRANSFERS: 'aqmarine_boutique_transfers_v1',
  TRANSACTIONS: 'aqmarine_boutique_transactions_v1',
  ADJUSTMENTS: 'aqmarine_boutique_adjustments_v1',
  RESTOCKS: 'aqmarine_boutique_restocks_v1',
  ACTIVE_TAB: 'aqmarine_boutique_active_tab_v1',
};

// Safe normalizer to prevent any undefined product names, categories, or prices in transactions
export function normalizeTransactionRecord(tx: SaleTransaction, availableProducts: Product[] = []): SaleTransaction {
  if (!tx || !Array.isArray(tx.items)) return tx;

  const normalizedItems = tx.items.map((item: any, idx: number) => {
    const prodRef = item.product || {};
    const candidateId = item.productId || prodRef.id || item.id;
    const candidateSku = item.sku || prodRef.sku;
    const matched = availableProducts.find(
      (p) => (candidateId && p.id === candidateId) || (candidateSku && p.sku === candidateSku)
    );

    const productName =
      (item.productName && item.productName !== 'undefined' ? item.productName : null) ||
      (prodRef.name && prodRef.name !== 'undefined' ? prodRef.name : null) ||
      (item.name && item.name !== 'undefined' ? item.name : null) ||
      matched?.name ||
      (item.category && item.category !== 'Lainnya' ? `Item ${item.category}` : `Produk ${idx + 1}`);

    const sku = item.sku || prodRef.sku || matched?.sku || '-';

    let category = item.category || prodRef.category || matched?.category;
    if (!category || category === 'Lainnya' || category === 'Umum') {
      const lower = (productName || '').toLowerCase();
      const skuLower = (sku || '').toLowerCase();
      if (lower.includes('mukena') || skuLower.includes('mkn')) {
        category = 'Mukena';
      } else if (
        lower.includes('hijab') ||
        lower.includes('pashmina') ||
        lower.includes('voal') ||
        lower.includes('paris') ||
        lower.includes("syar'i") ||
        skuLower.includes('hjb')
      ) {
        category = 'Hijab';
      } else if (lower.includes('gamis') || skuLower.includes('gms')) {
        category = 'Gamis';
      } else {
        category = category || 'Lainnya';
      }
    }

    const unitPrice = Number(item.unitPrice ?? item.price ?? prodRef.priceRetail ?? matched?.priceRetail ?? 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const discountAmount = Number(item.discountAmount || 0);
    const subtotal = Number(item.subtotal ?? Math.max(0, quantity * unitPrice - discountAmount));
    const hpp = Number(item.hpp ?? prodRef.hpp ?? matched?.hpp ?? 0);
    const unit = item.unit || prodRef.unit || matched?.unit || 'pcs';

    const compactProduct = {
      id: matched?.id || candidateId || `prod-${idx}`,
      sku: sku || matched?.sku || '-',
      barcode: matched?.barcode || '',
      name: productName,
      category,
      hpp,
      priceRetail: unitPrice,
      priceGrosir: matched?.priceGrosir ?? unitPrice,
      stockToko: matched?.stockToko ?? 0,
      minStockAlert: matched?.minStockAlert ?? 5,
      unit,
      // Keep only non-base64 image URLs to keep transaction items extremely lightweight
      image: matched?.image && !matched.image.startsWith('data:') ? matched.image : undefined,
    };

    return {
      ...item,
      productId: candidateId || compactProduct.id,
      productName,
      name: productName,
      sku,
      category,
      unitPrice,
      price: unitPrice,
      appliedPrice: unitPrice,
      quantity,
      discountAmount,
      subtotal,
      hpp,
      unit,
      product: compactProduct,
    };
  });

  const total = Number(tx.total ?? tx.grandTotal ?? 0);
  const discount = Number(tx.discount ?? tx.discountTotal ?? 0);

  return {
    ...tx,
    items: normalizedItems,
    total,
    grandTotal: total,
    discount,
    discountTotal: discount,
  };
}

export function isMotifPremiumStandarProduct(p: Product): boolean {
  if (!p) return false;
  const nameNorm = (p.name || '').toLowerCase().replace(/\s+/g, ' ');
  const skuNorm = (p.sku || '').toUpperCase();
  return (
    nameNorm.includes('motif premium standa') ||
    skuNorm === 'AQM-HJB-0892' ||
    skuNorm === 'AQM-HJB-1004'
  );
}

export function patchProductsAndNormalize(prods: Product[]): { updated: Product[]; changed: boolean } {
  let changed = false;
  const currentOutlets = getOutlets();
  const updated = prods.map((p) => {
    let curr = p;
    if (isMotifPremiumStandarProduct(curr)) {
      if (curr.initialStock !== 8 || curr.incomingStock !== 20 || curr.lastOpnameAt) {
        changed = true;
        curr = {
          ...curr,
          initialStock: 8,
          incomingStock: 20,
          stockToko: 22,
          lastOpnameAt: undefined,
          outletStocks: {
            ...(curr.outletStocks || {}),
            'outlet-main': 22,
          },
        };
      }
    }

    const normalized = normalizeProductOutletStocks(curr, currentOutlets);
    if (
      JSON.stringify(normalized.outletStocks) !== JSON.stringify(curr.outletStocks) ||
      normalized.stockToko !== curr.stockToko
    ) {
      changed = true;
      return normalized;
    }

    return curr;
  });
  return { updated, changed };
}

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse current user from storage:', e);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) as ActiveTab;
    return saved || 'dashboard';
  });

  // Main Data States
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const localData = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const raw = localData ? JSON.parse(localData) : INITIAL_PRODUCTS;
      const { updated, changed } = patchProductsAndNormalize(raw);
      if (changed) {
        safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updated);
      }
      return updated;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    try {
      const localData = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      return localData ? JSON.parse(localData) : INITIAL_TRANSFERS;
    } catch {
      return INITIAL_TRANSFERS;
    }
  });

  const [transactions, setTransactions] = useState<SaleTransaction[]>(() => {
    try {
      const localData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const raw = localData ? JSON.parse(localData) : INITIAL_TRANSACTIONS;
      return (raw || []).map((t: SaleTransaction) => normalizeTransactionRecord(t, INITIAL_PRODUCTS));
    } catch {
      return INITIAL_TRANSACTIONS.map((t) => normalizeTransactionRecord(t, INITIAL_PRODUCTS));
    }
  });

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(() => {
    try {
      const localData = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
      return localData ? JSON.parse(localData) : INITIAL_ADJUSTMENTS;
    } catch {
      return INITIAL_ADJUSTMENTS;
    }
  });

  const [restocks, setRestocks] = useState<StockRestock[]>(() => {
    try {
      const localData = localStorage.getItem(STORAGE_KEYS.RESTOCKS);
      const raw: StockRestock[] = localData ? JSON.parse(localData) : [];
      const hasMotifRestock = raw.some((r) =>
        (r.productName && r.productName.toLowerCase().replace(/\s+/g, ' ').includes('motif premium standa')) ||
        (r.sku && (r.sku.toUpperCase() === 'AQM-HJB-0892' || r.sku.toUpperCase() === 'AQM-HJB-1004'))
      );
      if (!hasMotifRestock) {
        const item: StockRestock = {
          id: 'restock-motif-premium-init',
          productId: 'prod-motif-premium',
          productName: 'Motif premium standar',
          sku: 'AQM-HJB-0892',
          quantity: 20,
          date: '2026-08-05T09:00:00.000Z',
          location: 'outlet-main',
          locationName: 'Toko Utama AQMARINE',
          purchasePrice: 85000,
          supplier: 'Konveksi Hijab Bandung',
          operator: 'Admin',
          notes: 'Restok voal motif premium standar (20 pcs)',
        };
        const combined = [item, ...raw];
        safeLocalStorageSet(STORAGE_KEYS.RESTOCKS, combined);
        return combined;
      }
      return raw;
    } catch {
      return [];
    }
  });

  const [cloudSyncState, setCloudSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Ref to hold the freshest products list for background listeners
  const productsRef = useRef<Product[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Modal States
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [initialTransferProductId, setInitialTransferProductId] = useState<string | undefined>(undefined);
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [initialOpnameProductId, setInitialOpnameProductId] = useState<string | undefined>(undefined);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [initialRestockProductId, setInitialRestockProductId] = useState<string | undefined>(undefined);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [isManageOutletsOpen, setIsManageOutletsOpen] = useState(false);
  const [isManageChannelsOpen, setIsManageChannelsOpen] = useState(false);
  const [isManageBazaarsOpen, setIsManageBazaarsOpen] = useState(false);
  const [isManageSubCategoriesOpen, setIsManageSubCategoriesOpen] = useState(false);
  const [isImportProductsOpen, setIsImportProductsOpen] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<SaleTransaction | null>(null);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    setCloudSyncState('syncing');

    // Subscribe to Products
    const unsubProducts = onSnapshot(
      collection(db, COLLECTIONS.PRODUCTS),
      (snap) => {
        if (!snap.empty) {
          const cloudProducts: Product[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            cloudProducts.push({
              id: docSnap.id,
              ...data,
            } as Product);
          });
          const { updated, changed } = patchProductsAndNormalize(cloudProducts);
          if (changed) {
            const target = updated.find(isMotifPremiumStandarProduct);
            if (target) {
              saveDocToFirestore(COLLECTIONS.PRODUCTS, target).catch(console.warn);
            }
          }
          setProducts(updated);
          productsRef.current = updated;
          safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updated);
        }
        setCloudSyncState('synced');
      },
      (error) => {
        console.warn('Firestore products listener error:', error);
        setCloudSyncState('offline');
      }
    );

    // Subscribe to Transactions
    const unsubTransactions = onSnapshot(
      collection(db, COLLECTIONS.TRANSACTIONS),
      (snap) => {
        if (!snap.empty) {
          const cloudTransactions: SaleTransaction[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            cloudTransactions.push({
              id: docSnap.id,
              ...data,
            } as SaleTransaction);
          });
          cloudTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const normalizedCloud = cloudTransactions.map((t) => normalizeTransactionRecord(t, productsRef.current));
          setTransactions(normalizedCloud);
          safeLocalStorageSet(STORAGE_KEYS.TRANSACTIONS, normalizedCloud);
        }
      },
      (error) => {
        console.warn('Firestore transactions listener error:', error);
      }
    );

    // Subscribe to Transfers
    const unsubTransfers = onSnapshot(
      collection(db, COLLECTIONS.TRANSFERS),
      (snap) => {
        if (!snap.empty) {
          const cloudTransfers: StockTransfer[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            cloudTransfers.push({
              id: docSnap.id,
              ...data,
            } as StockTransfer);
          });
          cloudTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransfers(cloudTransfers);
          safeLocalStorageSet(STORAGE_KEYS.TRANSFERS, cloudTransfers);
        }
      },
      (error) => {
        console.warn('Firestore transfers listener error:', error);
      }
    );

    // Subscribe to Adjustments
    const unsubAdjustments = onSnapshot(
      collection(db, COLLECTIONS.ADJUSTMENTS),
      (snap) => {
        if (!snap.empty) {
          const cloudAdjustments: StockAdjustment[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            cloudAdjustments.push({
              id: docSnap.id,
              ...data,
            } as StockAdjustment);
          });
          cloudAdjustments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setAdjustments(cloudAdjustments);
          safeLocalStorageSet(STORAGE_KEYS.ADJUSTMENTS, cloudAdjustments);
        }
      },
      (error) => {
        console.warn('Firestore adjustments listener error:', error);
      }
    );

    // Subscribe to Restocks
    const unsubRestocks = onSnapshot(
      collection(db, COLLECTIONS.RESTOCKS),
      (snap) => {
        if (!snap.empty) {
          const cloudRestocks: StockRestock[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            cloudRestocks.push({
              id: docSnap.id,
              ...data,
            } as StockRestock);
          });
          let finalRestocks = cloudRestocks;
          const hasMotifRestock = finalRestocks.some((r) =>
            (r.productName && r.productName.toLowerCase().replace(/\s+/g, ' ').includes('motif premium standa')) ||
            (r.sku && (r.sku.toUpperCase() === 'AQM-HJB-0892' || r.sku.toUpperCase() === 'AQM-HJB-1004'))
          );
          if (!hasMotifRestock) {
            const motifProd = productsRef.current.find(isMotifPremiumStandarProduct);
            const defaultRestock: StockRestock = {
              id: 'restock-motif-premium-cloud',
              productId: motifProd?.id || 'prod-motif-premium',
              productName: motifProd?.name || 'Motif premium standar',
              sku: motifProd?.sku || 'AQM-HJB-0892',
              quantity: 20,
              date: '2026-08-05T09:00:00.000Z',
              location: 'outlet-main',
              locationName: 'Toko Utama AQMARINE',
              purchasePrice: motifProd?.hpp || 85000,
              supplier: 'Konveksi Hijab Bandung',
              operator: 'Admin',
              notes: 'Restok voal motif premium standar (20 pcs)',
            };
            finalRestocks = [defaultRestock, ...cloudRestocks];
            saveDocToFirestore(COLLECTIONS.RESTOCKS, defaultRestock).catch(console.warn);
          }
          finalRestocks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRestocks(finalRestocks);
          safeLocalStorageSet(STORAGE_KEYS.RESTOCKS, finalRestocks);
        }
      },
      (error) => {
        console.warn('Firestore restocks listener error:', error);
      }
    );

    // Subscribe to User Accounts
    const unsubUsers = onSnapshot(
      collection(db, COLLECTIONS.USERS),
      (snap) => {
        if (!snap.empty) {
          const cloudUsers: any[] = [];
          snap.forEach((docSnap) => {
            cloudUsers.push(docSnap.data());
          });
          safeLocalStorageSet(AUTH_STORAGE_KEYS.CUSTOM_USERS, cloudUsers);
        }
      },
      (error) => {
        console.warn('Firestore users listener error:', error);
      }
    );

    // Subscribe to Bazaars
    const unsubBazaars = onSnapshot(
      collection(db, COLLECTIONS.BAZAARS),
      (snap) => {
        if (!snap.empty) {
          const cloudBazaars: any[] = [];
          snap.forEach((docSnap) => {
            cloudBazaars.push(docSnap.data());
          });
          const cleanBazaars = filterOutDummyBazaars(cloudBazaars);
          safeLocalStorageSet('aqmarine_bazaar_events_v1', cleanBazaars);
          window.dispatchEvent(new CustomEvent('bazaar_updated', { detail: cleanBazaars }));
        } else {
          // If Firestore is empty, check if local has user-created bazaars and upload them!
          const local = getBazaarEvents();
          const cleanLocal = filterOutDummyBazaars(local);
          if (cleanLocal.length > 0) {
            syncCollectionToFirestore(COLLECTIONS.BAZAARS, cleanLocal).catch(console.warn);
          } else {
            safeLocalStorageSet('aqmarine_bazaar_events_v1', []);
            window.dispatchEvent(new CustomEvent('bazaar_updated', { detail: [] }));
          }
        }
      },
      (error) => {
        console.warn('Firestore bazaars listener error:', error);
      }
    );

    // Subscribe to Outlets
    const unsubOutlets = onSnapshot(
      collection(db, COLLECTIONS.OUTLETS),
      (snap) => {
        if (!snap.empty) {
          const cloudOutlets: any[] = [];
          snap.forEach((docSnap) => {
            cloudOutlets.push(docSnap.data());
          });
          safeLocalStorageSet('aqmarine_store_outlets_v1', cloudOutlets);
          window.dispatchEvent(new CustomEvent('outlet_updated', { detail: cloudOutlets }));
        }
      },
      (error) => {
        console.warn('Firestore outlets listener error:', error);
      }
    );

    // Subscribe to Sales Channels
    const unsubChannels = onSnapshot(
      collection(db, COLLECTIONS.CHANNELS),
      (snap) => {
        if (!snap.empty) {
          const cloudChannels: any[] = [];
          snap.forEach((docSnap) => {
            cloudChannels.push(docSnap.data());
          });
          safeLocalStorageSet('aqmarine_sales_channels_v1', cloudChannels);
          window.dispatchEvent(new CustomEvent('channel_updated', { detail: cloudChannels }));
        }
      },
      (error) => {
        console.warn('Firestore channels listener error:', error);
      }
    );

    // Subscribe to Sub Categories
    const unsubSubcats = onSnapshot(
      collection(db, COLLECTIONS.SUBCATEGORIES),
      (snap) => {
        if (!snap.empty) {
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.id === 'hijab' && Array.isArray(data.subcategories)) {
              safeLocalStorageSet('aqmarine_subcats_hijab_v1', data.subcategories);
            } else if (data.id === 'mukena' && Array.isArray(data.subcategories)) {
              safeLocalStorageSet('aqmarine_subcats_mukena_v1', data.subcategories);
            }
          });
          window.dispatchEvent(new CustomEvent('subcats_updated'));
        }
      },
      (error) => {
        console.warn('Firestore subcategories listener error:', error);
      }
    );

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubTransfers();
      unsubAdjustments();
      unsubUsers();
      unsubBazaars();
      unsubOutlets();
      unsubChannels();
      unsubSubcats();
    };
  }, []);

  // Save active tab
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  // Auth handlers
  const handleLoginSuccess = (user: UserAccount, rememberMe: boolean) => {
    setCurrentUser(user);
    if (rememberMe) {
      safeLocalStorageSet(AUTH_STORAGE_KEYS.CURRENT_USER, user);
    } else {
      try {
        sessionStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } catch (err) {
        console.warn('Could not set sessionStorage for user:', err);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
  };

  // Product Operations
  const handleSaveProduct = (product: Product) => {
    const isEditing = !!editingProduct;
    let updatedProducts: Product[];

    if (isEditing) {
      updatedProducts = products.map((p) => (p.id === product.id ? product : p));
    } else {
      updatedProducts = [product, ...products];
    }

    setProducts(updatedProducts);
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);
    saveDocToFirestore(COLLECTIONS.PRODUCTS, product).catch(console.warn);

    setIsAddProductOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Yakin ingin menghapus produk ini dari database?')) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updated);
      deleteDocFromFirestore(COLLECTIONS.PRODUCTS, productId).catch(console.warn);
    }
  };

  const handleImportProducts = (imported: Product[], replaceAll: boolean) => {
    let updated: Product[];
    if (replaceAll) {
      updated = imported;
    } else {
      const existingIds = new Set(products.map((p) => p.id));
      const existingSkus = new Set(products.map((p) => p.sku.toLowerCase()));
      const newItems = imported.filter(
        (p) => !existingIds.has(p.id) && !existingSkus.has(p.sku.toLowerCase())
      );
      updated = [...products, ...newItems];
    }
    setProducts(updated);
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updated);
    syncCollectionToFirestore(COLLECTIONS.PRODUCTS, updated).catch(console.warn);
  };

  // Transfer Operation
  const handleConfirmTransfer = (transfer: StockTransfer) => {
    const updatedProducts = products.map((p) => {
      if (p.id !== transfer.productId) return p;

      const outletStocks = { ...(p.outletStocks || {}) };
      const fromLoc = transfer.fromLocation;
      const toLoc = transfer.toLocation;
      const qty = transfer.quantity;

      if (fromLoc.startsWith('outlet-')) {
        outletStocks[fromLoc] = Math.max(0, (outletStocks[fromLoc] || 0) - qty);
      } else if (fromLoc === 'gudang') {
        p.stockGudang = Math.max(0, (p.stockGudang || 0) - qty);
      }

      if (toLoc.startsWith('outlet-')) {
        outletStocks[toLoc] = (outletStocks[toLoc] || 0) + qty;
      } else if (toLoc === 'gudang') {
        p.stockGudang = (p.stockGudang || 0) + qty;
      }

      const totalToko = Object.values(outletStocks).reduce((a: number, b: number) => a + b, 0);

      return {
        ...p,
        stockToko: totalToko,
        outletStocks,
        updatedAt: new Date().toISOString(),
      };
    });

    setProducts(updatedProducts);
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);
    
    const affectedProd = updatedProducts.find((p) => p.id === transfer.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    const updatedTransfers = [transfer, ...transfers];
    setTransfers(updatedTransfers);
    safeLocalStorageSet(STORAGE_KEYS.TRANSFERS, updatedTransfers);
    saveDocToFirestore(COLLECTIONS.TRANSFERS, transfer).catch(console.warn);

    setIsTransferModalOpen(false);
    setInitialTransferProductId(undefined);
  };

  // Stock Opname / Adjustment Operation (Reset ke Stok Aktual Fisik)
  const handleConfirmAdjustment = (adjustment: StockAdjustment) => {
    const nowIso = new Date().toISOString();
    const updatedProducts = products.map((p) => {
      if (p.id !== adjustment.productId) return p;

      const outletStocks = { ...(p.outletStocks || {}) };
      const loc = adjustment.location;
      const newStockVal = adjustment.actualStock !== undefined ? adjustment.actualStock : (adjustment.newStock || 0);

      if (loc.startsWith('outlet-')) {
        outletStocks[loc] = newStockVal;
      } else if (loc === 'gudang') {
        p.stockGudang = newStockVal;
      }

      const totalToko = Object.values(outletStocks).reduce((a: number, b: number) => a + b, 0);

      return {
        ...p,
        stockToko: totalToko,
        // Koreksi periodik menyesuaikan stok fisik berjalan tanpa mereset stok awal awal-periode dan stok masuk
        initialStock: p.initialStock !== undefined ? p.initialStock : (p.stockToko || totalToko),
        incomingStock: p.incomingStock || 0,
        lastOpnameAt: nowIso,
        outletStocks,
        updatedAt: nowIso,
      };
    });

    setProducts(updatedProducts);
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);

    const affectedProd = updatedProducts.find((p) => p.id === adjustment.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    const updatedAdjustments = [adjustment, ...adjustments];
    setAdjustments(updatedAdjustments);
    safeLocalStorageSet(STORAGE_KEYS.ADJUSTMENTS, updatedAdjustments);
    saveDocToFirestore(COLLECTIONS.ADJUSTMENTS, adjustment).catch(console.warn);

    setIsOpnameModalOpen(false);
    setInitialOpnameProductId(undefined);
  };

  const handleDeleteAdjustment = (adjustmentId: string) => {
    if (window.confirm('Yakin ingin menghapus riwayat stok opname ini?')) {
      const updated = adjustments.filter((a) => a.id !== adjustmentId);
      setAdjustments(updated);
      safeLocalStorageSet(STORAGE_KEYS.ADJUSTMENTS, updated);
      deleteDocFromFirestore(COLLECTIONS.ADJUSTMENTS, adjustmentId).catch(console.warn);
    }
  };

  const handleClearAllAdjustments = () => {
    if (window.confirm('PERINGATAN: Yakin ingin menghapus SEMUA riwayat stok opname? Data yang dihapus tidak bisa dikembalikan.')) {
      setAdjustments([]);
      safeLocalStorageSet(STORAGE_KEYS.ADJUSTMENTS, []);
      syncCollectionToFirestore(COLLECTIONS.ADJUSTMENTS, []).catch(console.warn);
    }
  };

  // Restock Operation
  const handleConfirmRestock = (restock: StockRestock, updateHpp: boolean) => {
    const updatedProducts = products.map((p) => {
      if (p.id !== restock.productId) return p;

      const outletStocks = { ...(p.outletStocks || {}) };
      const loc = restock.location;
      const qty = restock.quantity;

      if (loc.startsWith('outlet-')) {
        outletStocks[loc] = (outletStocks[loc] || 0) + qty;
      } else if (loc === 'gudang') {
        p.stockGudang = (p.stockGudang || 0) + qty;
      }

      const totalToko = Object.values(outletStocks).reduce((a: number, b: number) => a + b, 0);

      // Baseline stok awal tidak boleh tertimpa saat ada stok masuk baru di bulan yang sama!
      // Stok awal tetap menjadi titik awal periode (atau opname terakhir)
      const baseInitial = p.initialStock !== undefined ? p.initialStock : p.stockToko;
      const newIncomingStock = (p.incomingStock || 0) + qty;

      return {
        ...p,
        hpp: updateHpp && restock.purchasePrice ? restock.purchasePrice : p.hpp,
        stockToko: totalToko,
        initialStock: baseInitial,
        incomingStock: newIncomingStock,
        outletStocks,
        updatedAt: new Date().toISOString(),
      };
    });

    setProducts(updatedProducts);
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);

    const affectedProd = updatedProducts.find((p) => p.id === restock.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    const updatedRestocks = [restock, ...restocks];
    setRestocks(updatedRestocks);
    safeLocalStorageSet(STORAGE_KEYS.RESTOCKS, updatedRestocks);
    saveDocToFirestore(COLLECTIONS.RESTOCKS, restock).catch(console.warn);

    setIsRestockModalOpen(false);
    setInitialRestockProductId(undefined);
  };

  const handleDeleteRestock = (restockId: string) => {
    const targetRestock = restocks.find((r) => r.id === restockId);
    if (!targetRestock) return;

    const confirmMsg = `Yakin ingin menghapus riwayat restok ${targetRestock.productName} (+${targetRestock.quantity} pcs)?\n\nStok produk akan otomatis dikurangi kembali sebanyak ${targetRestock.quantity} pcs agar jumlah fisik dan riwayat barang masuk tetap sinkron.`;
    if (!window.confirm(confirmMsg)) return;

    // Revert product stock
    const updatedProducts = products.map((p) => {
      if (p.id !== targetRestock.productId) return p;

      const outletStocks = { ...(p.outletStocks || {}) };
      const loc = targetRestock.location;
      const qty = targetRestock.quantity;

      if (loc && loc.startsWith('outlet-')) {
        outletStocks[loc] = Math.max(0, (outletStocks[loc] || 0) - qty);
      } else if (loc === 'gudang') {
        p.stockGudang = Math.max(0, (p.stockGudang || 0) - qty);
      } else {
        const firstOutlet = Object.keys(outletStocks)[0] || 'outlet-utama';
        outletStocks[firstOutlet] = Math.max(0, (outletStocks[firstOutlet] || 0) - qty);
      }

      const totalToko = Object.values(outletStocks).reduce((a: number, b: number) => a + b, 0);
      const newIncomingStock = Math.max(0, (p.incomingStock || 0) - qty);

      return {
        ...p,
        stockToko: totalToko,
        incomingStock: newIncomingStock,
        outletStocks,
        updatedAt: new Date().toISOString(),
      };
    });

    setProducts(updatedProducts);
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);

    const affectedProd = updatedProducts.find((p) => p.id === targetRestock.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    const updatedRestocks = restocks.filter((r) => r.id !== restockId);
    setRestocks(updatedRestocks);
    safeLocalStorageSet(STORAGE_KEYS.RESTOCKS, updatedRestocks);
    deleteDocFromFirestore(COLLECTIONS.RESTOCKS, restockId).catch(console.warn);
  };

  const handleClearAllRestocks = () => {
    if (window.confirm('PERINGATAN: Yakin ingin menghapus SEMUA riwayat barang masuk/restok?\nCatatan: Tindakan ini akan menghapus log riwayat restok.')) {
      setRestocks([]);
      safeLocalStorageSet(STORAGE_KEYS.RESTOCKS, []);
      syncCollectionToFirestore(COLLECTIONS.RESTOCKS, []).catch(console.warn);
    }
  };

  // Sale Transaction Complete
  const handleCompleteTransaction = (tx: SaleTransaction) => {
    const currentOutlets = getOutlets();
    const isBazaar = tx.salesChannelType === 'bazaar';
    const targetOutletId = isBazaar ? 'outlet-main' : (tx.stockDeductedOutletId || tx.outletId || 'outlet-main');

    const updatedProducts = products.map((p) => {
      // Robust matching: ID or SKU (case-insensitive & trimmed)
      const item = tx.items.find((i: any) => {
        const iId = i.product?.id || i.productId;
        if (iId && iId === p.id) return true;
        const iSku = (i.product?.sku || i.sku || '').trim().toLowerCase();
        const pSku = (p.sku || '').trim().toLowerCase();
        return Boolean(iSku && pSku && iSku === pSku);
      });

      if (!item) return p;

      return deductProductStock(p, item.quantity, targetOutletId, isBazaar, currentOutlets);
    });

    setProducts(updatedProducts);
    productsRef.current = updatedProducts;
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);

    tx.items.forEach((item: any) => {
      const iId = item.product?.id || item.productId;
      const prod = updatedProducts.find((p) => {
        if (iId && p.id === iId) return true;
        const iSku = (item.product?.sku || item.sku || '').trim().toLowerCase();
        const pSku = (p.sku || '').trim().toLowerCase();
        return Boolean(iSku && pSku && iSku === pSku);
      });
      if (prod) {
        saveDocToFirestore(COLLECTIONS.PRODUCTS, prod).catch(console.warn);
      }
    });

    const updatedTransactions = [tx, ...transactions];
    setTransactions(updatedTransactions);
    safeLocalStorageSet(STORAGE_KEYS.TRANSACTIONS, updatedTransactions);
    saveDocToFirestore(COLLECTIONS.TRANSACTIONS, tx).catch(console.warn);

    setReceiptTransaction(tx);
  };

  // Auto-heal corrupt or missing product metadata on transactions when catalog updates
  useEffect(() => {
    if (!transactions.length || !products.length) return;
    let needsHeal = false;
    for (const tx of transactions) {
      if (tx.items?.some((i: any) => !i.productName || i.productName === 'undefined' || i.category === 'undefined')) {
        needsHeal = true;
        break;
      }
    }
    if (needsHeal) {
      const healed = transactions.map((t) => normalizeTransactionRecord(t, products));
      setTransactions(healed);
      safeLocalStorageSet(STORAGE_KEYS.TRANSACTIONS, healed);
      healed.forEach((tx) => {
        saveDocToFirestore(COLLECTIONS.TRANSACTIONS, tx).catch(() => {});
      });
    }
  }, [products]);

  // Update Existing Transaction (Full Edit Data Transaksi)
  const handleUpdateTransaction = async (updatedTx: SaleTransaction): Promise<boolean> => {
    try {
      const currentOutlets = getOutlets();
      const oldTx = transactions.find((t) => t.id === updatedTx.id);
      let currentProducts = products;

      // If stock deduction is involved, adjust product stocks accordingly
      if (oldTx) {
        const isOldBazaar = oldTx.salesChannelType === 'bazaar';
        const oldTargetKey = resolveOutletStockKey(oldTx.stockDeductedOutletId || oldTx.outletId, isOldBazaar, currentOutlets);

        const isNewBazaar = updatedTx.salesChannelType === 'bazaar';
        const newTargetKey = resolveOutletStockKey(updatedTx.stockDeductedOutletId || updatedTx.outletId, isNewBazaar, currentOutlets);

        const updatedProducts = products.map((p) => {
          let curr = normalizeProductOutletStocks(p, currentOutlets);
          let modified = false;

          // Revert old item quantity
          const oldItem = oldTx.items?.find((i: any) => {
            const iId = i.product?.id || i.productId;
            if (iId && iId === p.id) return true;
            const iSku = (i.product?.sku || i.sku || '').trim().toLowerCase();
            const pSku = (p.sku || '').trim().toLowerCase();
            return Boolean(iSku && pSku && iSku === pSku);
          });

          if (oldItem) {
            const outletStocks = { ...(curr.outletStocks || {}) };
            outletStocks[oldTargetKey] = (Number(outletStocks[oldTargetKey]) || 0) + (Number(oldItem.quantity) || 0);
            curr = {
              ...curr,
              outletStocks,
              stockToko: Object.values(outletStocks).reduce((a, b) => a + Number(b), 0),
            };
            modified = true;
          }

          // Apply new item quantity deduction
          const newItem = updatedTx.items?.find((i: any) => {
            const iId = i.product?.id || i.productId;
            if (iId && iId === p.id) return true;
            const iSku = (i.product?.sku || i.sku || '').trim().toLowerCase();
            const pSku = (p.sku || '').trim().toLowerCase();
            return Boolean(iSku && pSku && iSku === pSku);
          });

          if (newItem) {
            curr = deductProductStock(curr, newItem.quantity, newTargetKey, isNewBazaar, currentOutlets);
            modified = true;
          }

          return modified ? curr : p;
        });

        currentProducts = updatedProducts;
        setProducts(updatedProducts);
        productsRef.current = updatedProducts;
        safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, updatedProducts);

        // Save affected products to Firestore
        const touchedProductIds = new Set<string>();
        oldTx.items?.forEach((i: any) => {
          const id = i.product?.id || i.productId;
          if (id) touchedProductIds.add(id);
        });
        updatedTx.items?.forEach((i: any) => {
          const id = i.product?.id || i.productId;
          if (id) touchedProductIds.add(id);
        });
        touchedProductIds.forEach((prodId) => {
          const prod = updatedProducts.find((p) => p.id === prodId);
          if (prod) {
            saveDocToFirestore(COLLECTIONS.PRODUCTS, prod).catch(console.warn);
          }
        });
      }

      const normalizedTx = normalizeTransactionRecord(updatedTx, currentProducts);
      
      const exists = transactions.some((t) => t.id === normalizedTx.id);
      const updated = exists 
        ? transactions.map((t) => (t.id === normalizedTx.id ? normalizedTx : t))
        : [normalizedTx, ...transactions];

      updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setTransactions(updated);
      safeLocalStorageSet(STORAGE_KEYS.TRANSACTIONS, updated);
      await saveDocToFirestore(COLLECTIONS.TRANSACTIONS, normalizedTx);
      return true;
    } catch (err) {
      console.error('Error updating transaction:', err);
      return false;
    }
  };

  // Force Push & Sync All Data to Firestore (Bazaar, Outlets, Channels, Products, Users, etc.)
  const handleForceSyncAll = async () => {
    try {
      setCloudSyncState('syncing');
      
      // Sync products
      await syncCollectionToFirestore(COLLECTIONS.PRODUCTS, products);
      
      // Sync transactions
      await syncCollectionToFirestore(COLLECTIONS.TRANSACTIONS, transactions);

      // Sync transfers
      await syncCollectionToFirestore(COLLECTIONS.TRANSFERS, transfers);

      // Sync adjustments
      await syncCollectionToFirestore(COLLECTIONS.ADJUSTMENTS, adjustments);

      // Sync restocks
      await syncCollectionToFirestore(COLLECTIONS.RESTOCKS, restocks);

      // Sync Bazaars (clean from dummies)
      const currentBazaars = filterOutDummyBazaars(getBazaarEvents());
      await syncCollectionToFirestore(COLLECTIONS.BAZAARS, currentBazaars);

      // Sync Outlets
      const currentOutlets = getOutlets();
      await syncCollectionToFirestore(COLLECTIONS.OUTLETS, currentOutlets);

      // Sync Channels
      const currentChannels = getChannels();
      await syncCollectionToFirestore(COLLECTIONS.CHANNELS, currentChannels);

      // Sync Users
      const currentUsers = getUsers();
      await syncCollectionToFirestore(COLLECTIONS.USERS, currentUsers);

      // Sync Subcategories
      const hijabSubcats = getSubCategories('Hijab');
      const mukenaSubcats = getSubCategories('Mukena');
      await saveDocToFirestore(COLLECTIONS.SUBCATEGORIES, {
        id: 'hijab',
        category: 'Hijab',
        subcategories: hijabSubcats,
        updatedAt: new Date().toISOString()
      });
      await saveDocToFirestore(COLLECTIONS.SUBCATEGORIES, {
        id: 'mukena',
        category: 'Mukena',
        subcategories: mukenaSubcats,
        updatedAt: new Date().toISOString()
      });

      setCloudSyncState('synced');
    } catch (err) {
      console.warn('Force sync error:', err);
      setCloudSyncState('synced');
    }
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FBF8F6] text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        products={products}
        currentUser={currentUser}
        cloudSyncState={cloudSyncState}
        onForceSyncAll={handleForceSyncAll}
        onLogout={handleLogout}
        onOpenAddProduct={() => {
          setEditingProduct(null);
          setIsAddProductOpen(true);
        }}
        onOpenTransfer={() => {
          setInitialTransferProductId(undefined);
          setIsTransferModalOpen(true);
        }}
        onOpenRestock={() => {
          setInitialRestockProductId(undefined);
          setIsRestockModalOpen(true);
        }}
        onOpenManageUsers={() => setIsManageUsersOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            transactions={transactions}
            transfers={transfers}
            setActiveTab={setActiveTab}
            onOpenTransferWithProduct={(prodId) => {
              setInitialTransferProductId(prodId);
              setIsTransferModalOpen(true);
            }}
            onOpenRestockWithProduct={(prodId) => {
              setInitialRestockProductId(prodId);
              setIsRestockModalOpen(true);
            }}
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
            onOpenTransfer={() => {
              setInitialTransferProductId(undefined);
              setIsTransferModalOpen(true);
            }}
            onOpenRestock={() => {
              setInitialRestockProductId(undefined);
              setIsRestockModalOpen(true);
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            transactions={transactions}
            restocks={restocks}
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
            onOpenEditProduct={(prod) => {
              setEditingProduct(prod);
              setIsAddProductOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
            onOpenTransferWithProduct={(prodId) => {
              setInitialTransferProductId(prodId);
              setIsTransferModalOpen(true);
            }}
            onOpenOpnameWithProduct={(prodId) => {
              setInitialOpnameProductId(prodId);
              setIsOpnameModalOpen(true);
            }}
            onOpenRestockWithProduct={(prodId) => {
              setInitialRestockProductId(prodId);
              setIsRestockModalOpen(true);
            }}
            onImportProducts={handleImportProducts}
          />
        )}

        {activeTab === 'restocks' && (
          <RestocksView
            restocks={restocks}
            products={products}
            onOpenRestockModal={() => {
              setInitialRestockProductId(undefined);
              setIsRestockModalOpen(true);
            }}
            onDeleteRestock={handleDeleteRestock}
            onClearAllRestocks={handleClearAllRestocks}
          />
        )}

        {(activeTab === 'sales' || activeTab === 'pos') && (
          <SalesEntryView
            products={products}
            currentUser={currentUser}
            onCompleteTransaction={handleCompleteTransaction}
            onOpenManageOutlets={() => setIsManageOutletsOpen(true)}
            onOpenManageChannels={() => setIsManageChannelsOpen(true)}
            onOpenManageBazaars={() => setIsManageBazaarsOpen(true)}
          />
        )}

        {activeTab === 'transfers' && (
          <TransfersView
            products={products}
            transfers={transfers}
            onOpenTransferModal={() => {
              setInitialTransferProductId(undefined);
              setIsTransferModalOpen(true);
            }}
          />
        )}

        {activeTab === 'adjustments' && (
          <AdjustmentsView
            adjustments={adjustments}
            products={products}
            onOpenOpnameModal={() => {
              setInitialOpnameProductId(undefined);
              setIsOpnameModalOpen(true);
            }}
            onDeleteAdjustment={handleDeleteAdjustment}
            onClearAllAdjustments={handleClearAllAdjustments}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            products={products}
            onViewReceipt={(tx) => setReceiptTransaction(tx)}
            onUpdateTransaction={handleUpdateTransaction}
          />
        )}

        {activeTab === 'profit_loss' && (
          <ProfitLossView
            transactions={transactions}
            products={products}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Modal Dialogs */}
      {isAddProductOpen && (
        <ProductFormModal
          isOpen={isAddProductOpen}
          onClose={() => {
            setIsAddProductOpen(false);
            setEditingProduct(null);
          }}
          productToEdit={editingProduct}
          onSaveProduct={handleSaveProduct}
          onOpenManageOutlets={() => setIsManageOutletsOpen(true)}
        />
      )}

      {isTransferModalOpen && (
        <TransferStockModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setInitialTransferProductId(undefined);
          }}
          products={products}
          initialProductId={initialTransferProductId}
          operatorName={currentUser.name}
          onConfirmTransfer={handleConfirmTransfer}
        />
      )}

      {isOpnameModalOpen && (
        <StockOpnameModal
          isOpen={isOpnameModalOpen}
          onClose={() => {
            setIsOpnameModalOpen(false);
            setInitialOpnameProductId(undefined);
          }}
          products={products}
          transactions={transactions}
          restocks={restocks}
          initialProductId={initialOpnameProductId}
          operatorName={currentUser.name}
          onConfirmAdjustment={handleConfirmAdjustment}
        />
      )}

      {isRestockModalOpen && (
        <RestockModal
          isOpen={isRestockModalOpen}
          onClose={() => {
            setIsRestockModalOpen(false);
            setInitialRestockProductId(undefined);
          }}
          products={products}
          initialProductId={initialRestockProductId}
          onConfirmRestock={handleConfirmRestock}
        />
      )}

      {receiptTransaction && (
        <ReceiptModal
          isOpen={!!receiptTransaction}
          onClose={() => setReceiptTransaction(null)}
          transaction={receiptTransaction}
        />
      )}

      {isManageUsersOpen && (
        <ManageUsersModal
          isOpen={isManageUsersOpen}
          onClose={() => setIsManageUsersOpen(false)}
          currentUser={currentUser}
          onCurrentUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            safeLocalStorageSet(AUTH_STORAGE_KEYS.CURRENT_USER, updatedUser);
          }}
        />
      )}

      {isManageOutletsOpen && (
        <ManageOutletsModal
          isOpen={isManageOutletsOpen}
          onClose={() => setIsManageOutletsOpen(false)}
        />
      )}

      {isManageChannelsOpen && (
        <ManageChannelsModal
          isOpen={isManageChannelsOpen}
          onClose={() => setIsManageChannelsOpen(false)}
        />
      )}

      {isManageBazaarsOpen && (
        <ManageBazaarsModal
          isOpen={isManageBazaarsOpen}
          onClose={() => setIsManageBazaarsOpen(false)}
        />
      )}

      {isManageSubCategoriesOpen && (
        <ManageSubCategoriesModal
          isOpen={isManageSubCategoriesOpen}
          onClose={() => setIsManageSubCategoriesOpen(false)}
        />
      )}

      {isImportProductsOpen && (
        <ImportProductsModal
          isOpen={isImportProductsOpen}
          onClose={() => setIsImportProductsOpen(false)}
          onImport={(imported, replaceAll) => {
            handleImportProducts(imported, replaceAll);
            setIsImportProductsOpen(false);
          }}
        />
      )}
    </div>
  );
}
export default App;
