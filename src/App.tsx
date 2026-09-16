import { observeAccount, logout } from './lib/auth';
import { commitSale, commitMovement, deleteMovement, deleteSale, updateMovement } from './lib/transactions';
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
import { SalesEntryView } from './components/SalesEntryView';
import { TransfersView } from './components/TransfersView';
import { RestocksView } from './components/RestocksView';
import { AdjustmentsView } from './components/AdjustmentsView';
import { ReportsView } from './components/ReportsView';
import { ActivityCalendarView } from './components/ActivityCalendarView';
import { ProfitLossView } from './components/ProfitLossView';
import { ProductFormModal } from './components/ProductFormModal';
import { TransferStockModal } from './components/TransferStockModal';
import { StockOpnameModal } from './components/StockOpnameModal';
import { RestockModal } from './components/RestockModal';
import { MovementEditModal } from './components/MovementEditModal';
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
import { COLLECTIONS, saveDocument, deleteDocument, upsertDocuments, subscribeCollection } from './lib/supabase';
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
const canonicalProductName = (value: unknown) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^(hijab|mukena)\s+/, '')
  .replace(/standart/g, 'standar')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function normalizeTransactionRecord(tx: SaleTransaction, availableProducts: Product[] = []): SaleTransaction {
  if (!tx) return tx;

  const parsedSummaryItems = !tx.items?.length && tx.productDetails
    ? tx.productDetails.split(';').map((part) => {
        const match = part.trim().match(/^(.*?)\s*\((\d+)\s*pcs\)$/i);
        return match ? { productName: match[1].trim(), quantity: Number(match[2]) } : null;
      }).filter(Boolean) as Array<{ productName: string; quantity: number }>
    : [];
  const sourceItems = tx.items?.length ? tx.items : parsedSummaryItems;
  const isImportedSummary = Boolean(tx.migrationSource?.startsWith('transactions_csv'));

  const normalizedItems = sourceItems.map((item: any, idx: number) => {
    const prodRef = item.product || {};
    const candidateId = item.productId || prodRef.id || item.id;
    const rawSku = item.sku || prodRef.sku;
    const candidateSku = rawSku && rawSku !== '-' ? rawSku : undefined;
    const candidateName = item.productName || prodRef.name || item.name;
    const canonicalCandidate = canonicalProductName(candidateName);
    const matched = availableProducts.find(
      (p) => (candidateId && p.id === candidateId) ||
        (candidateSku && p.sku === candidateSku) ||
        (canonicalCandidate && (() => {
          const canonicalProduct = canonicalProductName(p.name);
          return canonicalProduct === canonicalCandidate ||
            (canonicalCandidate.length >= 6 && canonicalProduct.includes(canonicalCandidate)) ||
            (canonicalProduct.length >= 6 && canonicalCandidate.includes(canonicalProduct));
        })())
    );

    const productName =
      matched?.name ||
      (item.productName && item.productName !== 'undefined' ? item.productName : null) ||
      (prodRef.name && prodRef.name !== 'undefined' ? prodRef.name : null) ||
      (item.name && item.name !== 'undefined' ? item.name : null) ||
      (item.category && item.category !== 'Lainnya' ? `Item ${item.category}` : `Produk ${idx + 1}`);

    const sku = matched?.sku || candidateSku || '-';

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

    const unitPrice = Number(isImportedSummary
      ? matched?.priceRetail ?? item.unitPrice ?? item.price ?? prodRef.priceRetail ?? 0
      : item.unitPrice ?? item.price ?? prodRef.priceRetail ?? matched?.priceRetail ?? 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const discountAmount = Number(item.discountAmount || 0);
    const subtotal = Number(item.subtotal ?? Math.max(0, quantity * unitPrice - discountAmount));
    const hpp = Number(isImportedSummary
      ? matched?.hpp ?? item.hpp ?? prodRef.hpp ?? 0
      : item.hpp ?? prodRef.hpp ?? matched?.hpp ?? 0);
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
      productId: matched?.id || candidateId || compactProduct.id,
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

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => observeAccount((account, error) => {
    setCurrentUser(account); setAuthError(error || ''); setAuthReady(true);
  }), []);
  const perform = async (operation: () => Promise<unknown>, done?: () => void) => {
    if (saveLock.current) return false;
    saveLock.current = true; setSaving(true); setOperationError('');
    try { await operation(); done?.(); return true; }
    catch (error) { setOperationError(error instanceof Error ? error.message : 'Data gagal disimpan. Coba kembali.'); return false; }
    finally { saveLock.current = false; setSaving(false); }
  };
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) as ActiveTab;
    return saved === 'sales' ? 'pos' : saved || 'dashboard';
  });

  // Main Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [restocks, setRestocks] = useState<StockRestock[]>([]);
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
  const [editingMovement, setEditingMovement] = useState<{ kind:'transfers'|'adjustments'|'restocks'; record:StockTransfer|StockAdjustment|StockRestock } | null>(null);

  // Attach only after authentication. Empty collections replace stale views too.
  useEffect(() => {
    if (!currentUser) { setProducts([]); setTransactions([]); setTransfers([]); setAdjustments([]); setRestocks([]); return; }
    setCloudSyncState('syncing');
    const pending = new Set(['products', 'transactions', 'transfers', 'adjustments', 'restocks', 'outlets', 'salesChannels', 'bazaars', 'subCategories']);
    const failed = new Set<string>();
    const subscribe = (name: string, apply: (items: any[]) => void) => subscribeCollection(name, items => {
      apply(items);
      pending.delete(name); failed.delete(name);
      setCloudSyncState(failed.size ? 'offline' : pending.size ? 'syncing' : 'synced');
    }, () => { failed.add(name); setCloudSyncState('offline'); setOperationError('Sebagian data belum dapat dimuat. Periksa koneksi, kuota, atau hak akses, lalu tekan Muat ulang.'); });
    const cache = (key: string, event: string) => (items: any[]) => { safeLocalStorageSet(key, items); window.dispatchEvent(new CustomEvent(event, { detail: items })); };
    const unsubscribers = [
      subscribe('products', items => {
        setProducts(items);
        productsRef.current = items;
        setTransactions(current => current.map(tx => normalizeTransactionRecord(tx, items)));
      }),
      subscribe('transactions', items => setTransactions(items.map(t => normalizeTransactionRecord(t, productsRef.current)).sort((a,b) => b.date.localeCompare(a.date)))),
      subscribe('transfers', setTransfers), subscribe('adjustments', setAdjustments), subscribe('restocks', setRestocks),
      subscribe('outlets', cache('aqmarine_store_outlets_v1', 'outlet_updated')),
      subscribe('salesChannels', cache('aqmarine_sales_channels_v1', 'channel_updated')),
      subscribe('bazaars', cache('aqmarine_bazaar_events_v1', 'bazaar_updated')),
      subscribe('subCategories', items => { items.forEach(d => { if (d.id === 'hijab' || d.id === 'mukena') safeLocalStorageSet('aqmarine_subcats_' + d.id + '_v1', d.subcategories || []); }); window.dispatchEvent(new CustomEvent('subcats_updated')); }),
    ];
    return () => unsubscribers.forEach(stop => stop());
  }, [currentUser?.id, reloadToken]);

  useEffect(() => {
    const failed = () => { setCloudSyncState('offline'); setOperationError('Perubahan belum tersimpan di server. Muat ulang untuk melihat data terakhir dan coba kembali.'); };
    window.addEventListener('aqmarine:save-error', failed);
    return () => window.removeEventListener('aqmarine:save-error', failed);
  }, []);
  // Save active tab
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  const handleLogout = async () => {
    try { await logout(); } catch { setOperationError('Gagal keluar. Coba kembali.'); return; }
    Object.keys(localStorage).filter(key => key.startsWith('aqmarine_')).forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
  };
  const handleSaveProduct = async (product: Product) => {
    await perform(() => saveDocument(COLLECTIONS.PRODUCTS, product), () => { setIsAddProductOpen(false); setEditingProduct(null); });
  };
  const handleDeleteProduct = async (id: string) => {
    const isReferenced = transactions.some(tx => tx.items.some(item => (item.productId || item.product?.id) === id)) || transfers.some(item => item.productId === id) || adjustments.some(item => item.productId === id) || restocks.some(item => item.productId === id);
    if (isReferenced) { setOperationError('Produk tidak dapat dihapus karena sudah memiliki riwayat. Nonaktifkan atau ubah data produknya agar keterkaitan laporan tetap utuh.'); return; }
    if (window.confirm('Hapus produk ini? Riwayat transaksi tetap disimpan.')) await perform(() => deleteDocument(COLLECTIONS.PRODUCTS, id));
  };
  const handleImportProducts = async (imported: Product[], replaceAll: boolean) => {
    if (replaceAll) { setOperationError('Penggantian seluruh katalog dinonaktifkan untuk melindungi stok dan riwayat. Gunakan tambah produk baru.'); return; }
    const ids = new Set(products.map(p => p.id));
    const skus = new Set(products.map(p => p.sku.toLowerCase()));
    const fresh = imported.filter(p => !ids.has(p.id) && !skus.has(p.sku.toLowerCase()));
    await perform(() => upsertDocuments(COLLECTIONS.PRODUCTS, fresh));
  };
  const handleConfirmTransfer = async (record: StockTransfer) => {
    await perform(() => commitMovement('transfers', record), () => setIsTransferModalOpen(false));
  };
  const handleConfirmAdjustment = async (record: StockAdjustment) => {
    await perform(() => commitMovement('adjustments', record), () => setIsOpnameModalOpen(false));
  };
  const handleConfirmRestock = async (record: StockRestock, updateHpp: boolean) => {
    await perform(() => commitMovement('restocks', record, updateHpp), () => setIsRestockModalOpen(false));
  };
  const handleCompleteTransaction = async (tx: SaleTransaction) => perform(() => commitSale(tx), () => setReceiptTransaction(tx));
  const handleUpdateTransaction = async (tx: SaleTransaction, previous: SaleTransaction): Promise<boolean> => perform(() => commitSale(tx, true, previous));
  const handleDeleteTransaction = async (tx: SaleTransaction) => {
    if (window.confirm(`Hapus transaksi ${tx.transactionNumber}? Stok barang akan dikembalikan otomatis.`)) await perform(() => deleteSale(tx.id, tx));
  };
  const handleUpdateMovement = async (record: StockTransfer | StockAdjustment | StockRestock, updateHpp: boolean) => {
    if (!editingMovement) return false;
    return perform(() => updateMovement(editingMovement.kind, record, updateHpp));
  };
  const handleDeleteMovement = async (kind: 'transfers'|'adjustments'|'restocks', record: StockTransfer | StockAdjustment | StockRestock) => {
    const label = kind === 'restocks' ? 'barang masuk' : kind === 'transfers' ? 'mutasi' : 'opname';
    if (window.confirm(`Hapus catatan ${label} ini? Dampak stoknya akan dibatalkan otomatis.`)) await perform(() => deleteMovement(kind, record.id));
  };
  // Refresh reads; never overwrite cloud data from a stale device.
  const handleForceSyncAll = () => { setOperationError(''); setReloadToken(token => token + 1); };

  // If not logged in, show Login Screen
  if (!authReady) return <div className="loading-screen" role="status">Memverifikasi sesi…</div>;
  if (!currentUser) return <LoginView error={authError} />;

  return (
    <div className="app-shell min-h-screen bg-[#FBF8F6] text-slate-800 font-sans">
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

      {(operationError || saving) && <div className="operation-status" role={operationError ? 'alert' : 'status'}>{saving ? 'Menyimpan perubahan…' : operationError}{operationError && !saving && <button onClick={() => setOperationError('')} aria-label="Tutup pesan">×</button>}</div>}
      {/* Main Content Area */}
      <main className="workspace-main">
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
            onEdit={(record) => setEditingMovement({kind:'transfers',record})}
            onDelete={(record) => void handleDeleteMovement('transfers', record)}
          />
        )}

        {activeTab === 'restocks' && (
          <RestocksView
            restocks={restocks}
            onOpenRestockModal={() => {
              setInitialRestockProductId(undefined);
              setIsRestockModalOpen(true);
            }}
            onEdit={(record) => setEditingMovement({kind:'restocks',record})}
            onDelete={(record) => void handleDeleteMovement('restocks', record)}
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
            onEdit={(record) => setEditingMovement({kind:'adjustments',record})}
            onDelete={(record) => void handleDeleteMovement('adjustments', record)}
          />
        )}

        {activeTab === 'calendar' && (
          <ActivityCalendarView
            products={products}
            transactions={transactions}
            restocks={restocks}
            transfers={transfers}
            adjustments={adjustments}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            products={products}
            onViewReceipt={(tx) => setReceiptTransaction(tx)}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'profit_loss' && ['owner', 'superadmin'].includes(currentUser.role) && (
          <ProfitLossView
            transactions={transactions}
            products={products}
            currentUser={currentUser}
          />
        )}
      <footer className="app-credits">Uicons by <a href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer">Flaticon</a></footer></main>

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
          operatorName={currentUser.name}
        />
      )}

      {receiptTransaction && (
        <ReceiptModal
          isOpen={!!receiptTransaction}
          onClose={() => setReceiptTransaction(null)}
          transaction={receiptTransaction}
        />
      )}

      {editingMovement && (
        <MovementEditModal
          kind={editingMovement.kind}
          record={editingMovement.record}
          products={products}
          onClose={() => setEditingMovement(null)}
          onSave={handleUpdateMovement}
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
