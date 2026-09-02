import React, { useState, useEffect } from 'react';
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
import { SalesEntryView } from './components/SalesEntryView';
import { TransfersView } from './components/TransfersView';
import { AdjustmentsView } from './components/AdjustmentsView';
import { ReportsView } from './components/ReportsView';
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
import { getOutlets, getChannels, saveOutlets, saveChannels } from './utils/outletStorage';
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

const STORAGE_KEYS = {
  PRODUCTS: 'aqmarine_boutique_products_v1',
  TRANSFERS: 'aqmarine_boutique_transfers_v1',
  TRANSACTIONS: 'aqmarine_boutique_transactions_v1',
  ADJUSTMENTS: 'aqmarine_boutique_adjustments_v1',
  ACTIVE_TAB: 'aqmarine_boutique_active_tab_v1',
};

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
      return localData ? JSON.parse(localData) : INITIAL_PRODUCTS;
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
      return localData ? JSON.parse(localData) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
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

  const [cloudSyncState, setCloudSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');

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
            cloudProducts.push(docSnap.data() as Product);
          });
          setProducts(cloudProducts);
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cloudProducts));
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
            cloudTransactions.push(docSnap.data() as SaleTransaction);
          });
          cloudTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(cloudTransactions);
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cloudTransactions));
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
            cloudTransfers.push(docSnap.data() as StockTransfer);
          });
          cloudTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransfers(cloudTransfers);
          localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(cloudTransfers));
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
            cloudAdjustments.push(docSnap.data() as StockAdjustment);
          });
          cloudAdjustments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setAdjustments(cloudAdjustments);
          localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(cloudAdjustments));
        }
      },
      (error) => {
        console.warn('Firestore adjustments listener error:', error);
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
          localStorage.setItem(AUTH_STORAGE_KEYS.CUSTOM_USERS, JSON.stringify(cloudUsers));
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
          localStorage.setItem('aqmarine_bazaar_events_v1', JSON.stringify(cleanBazaars));
          window.dispatchEvent(new CustomEvent('bazaar_updated', { detail: cleanBazaars }));
        } else {
          // If Firestore is empty, check if local has user-created bazaars and upload them!
          const local = getBazaarEvents();
          const cleanLocal = filterOutDummyBazaars(local);
          if (cleanLocal.length > 0) {
            syncCollectionToFirestore(COLLECTIONS.BAZAARS, cleanLocal).catch(console.warn);
          } else {
            localStorage.setItem('aqmarine_bazaar_events_v1', JSON.stringify([]));
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
          localStorage.setItem('aqmarine_store_outlets_v1', JSON.stringify(cloudOutlets));
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
          localStorage.setItem('aqmarine_sales_channels_v1', JSON.stringify(cloudChannels));
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
              localStorage.setItem('aqmarine_subcats_hijab_v1', JSON.stringify(data.subcategories));
            } else if (data.id === 'mukena' && Array.isArray(data.subcategories)) {
              localStorage.setItem('aqmarine_subcats_mukena_v1', JSON.stringify(data.subcategories));
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
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  // Auth handlers
  const handleLoginSuccess = (user: UserAccount, rememberMe: boolean) => {
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
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
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    saveDocToFirestore(COLLECTIONS.PRODUCTS, product).catch(console.warn);

    setIsAddProductOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Yakin ingin menghapus produk ini dari database?')) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
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
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
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
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    
    const affectedProd = updatedProducts.find((p) => p.id === transfer.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    const updatedTransfers = [transfer, ...transfers];
    setTransfers(updatedTransfers);
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(updatedTransfers));
    saveDocToFirestore(COLLECTIONS.TRANSFERS, transfer).catch(console.warn);

    setIsTransferModalOpen(false);
    setInitialTransferProductId(undefined);
  };

  // Stock Opname / Adjustment Operation
  const handleConfirmAdjustment = (adjustment: StockAdjustment) => {
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
        outletStocks,
        updatedAt: new Date().toISOString(),
      };
    });

    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    const affectedProd = updatedProducts.find((p) => p.id === adjustment.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    const updatedAdjustments = [adjustment, ...adjustments];
    setAdjustments(updatedAdjustments);
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(updatedAdjustments));
    saveDocToFirestore(COLLECTIONS.ADJUSTMENTS, adjustment).catch(console.warn);

    setIsOpnameModalOpen(false);
    setInitialOpnameProductId(undefined);
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

      return {
        ...p,
        hpp: updateHpp && restock.purchasePrice ? restock.purchasePrice : p.hpp,
        stockToko: totalToko,
        outletStocks,
        updatedAt: new Date().toISOString(),
      };
    });

    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    const affectedProd = updatedProducts.find((p) => p.id === restock.productId);
    if (affectedProd) {
      saveDocToFirestore(COLLECTIONS.PRODUCTS, affectedProd).catch(console.warn);
    }

    setIsRestockModalOpen(false);
    setInitialRestockProductId(undefined);
  };

  // Sale Transaction Complete
  const handleCompleteTransaction = (tx: SaleTransaction) => {
    const updatedProducts = products.map((p) => {
      const item = tx.items.find((i: any) => (i.product?.id || i.productId) === p.id);
      if (!item) return p;

      const outletStocks = { ...(p.outletStocks || {}) };
      const outletId = tx.stockDeductedOutletId || tx.outletId || 'outlet-main';
      
      outletStocks[outletId] = Math.max(0, (outletStocks[outletId] || 0) - item.quantity);
      const totalToko = Object.values(outletStocks).reduce((a: number, b: number) => a + b, 0);

      return {
        ...p,
        stockToko: totalToko,
        outletStocks,
        updatedAt: new Date().toISOString(),
      };
    });

    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    tx.items.forEach((item: any) => {
      const prodId = item.product?.id || item.productId;
      const prod = updatedProducts.find((p) => p.id === prodId);
      if (prod) {
        saveDocToFirestore(COLLECTIONS.PRODUCTS, prod).catch(console.warn);
      }
    });

    const updatedTransactions = [tx, ...transactions];
    setTransactions(updatedTransactions);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));
    saveDocToFirestore(COLLECTIONS.TRANSACTIONS, tx).catch(console.warn);

    setReceiptTransaction(tx);
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
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            products={products}
            onViewReceipt={(tx) => setReceiptTransaction(tx)}
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
            localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
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
