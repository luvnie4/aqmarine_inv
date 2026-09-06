import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Store, 
  Tent, 
  CreditCard, 
  Trash2, 
  Plus, 
  FileEdit, 
  ShoppingBag,
  Tag,
  AlertCircle
} from 'lucide-react';
import { SaleTransaction, Product, PaymentMethod } from '../types';
import { formatRupiah, toDateInputString, toTimeInputString } from '../utils/formatters';
import { getOutlets, getChannels } from '../utils/outletStorage';
import { getBazaarEvents } from '../utils/bazaarStorage';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: SaleTransaction | null;
  products: Product[];
  onClose: () => void;
  onSave: (updatedTransaction: SaleTransaction) => void;
}

interface EditableItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  selectedPriceType: 'retail' | 'grosir' | 'custom';
  unit: string;
  notes?: string;
  productRef?: Product;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  products,
  onClose,
  onSave,
}) => {
  if (!isOpen || !transaction) return null;

  const outlets = useMemo(() => getOutlets(), []);
  const bazaars = useMemo(() => getBazaarEvents(), []);
  const channels = useMemo(() => getChannels(), []);

  // Dates & Times
  const initialDate = transaction.date ? new Date(transaction.date) : new Date();
  const validDate = !isNaN(initialDate.getTime()) ? initialDate : new Date();
  const [dateStr, setDateStr] = useState<string>(toDateInputString(validDate));
  const [timeStr, setTimeStr] = useState<string>(toTimeInputString(validDate));

  // Customer & Cashier Info
  const [customerName, setCustomerName] = useState<string>(transaction.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(transaction.customerPhone || '');
  const [cashier, setCashier] = useState<string>(transaction.cashier || transaction.operator || '');

  // Channel & Location
  const [channelType, setChannelType] = useState<string>(
    transaction.salesChannelType || 
    (transaction.bazaarId ? 'bazaar' : 'toko')
  );
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    transaction.stockDeductedOutletId || transaction.outletId || (outlets[0]?.id || '')
  );
  const [selectedBazaarId, setSelectedBazaarId] = useState<string>(transaction.bazaarId || '');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.paymentMethod || 'cash');
  const [cashPaid, setCashPaid] = useState<number>(transaction.cashPaid ?? transaction.total ?? 0);

  // Notes & Discounts
  const [discountTotal, setDiscountTotal] = useState<number>(transaction.discountTotal || transaction.discount || 0);
  const [notes, setNotes] = useState<string>(transaction.notes || '');

  // Product Selection for Adding New Items
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');

  // Editable Items
  const [items, setItems] = useState<EditableItem[]>(() => {
    if (!transaction.items || !Array.isArray(transaction.items)) return [];
    return transaction.items.map((item: any, idx: number) => {
      const prod = item.product || {};
      const matched = products.find(
        (p) => (item.productId && p.id === item.productId) || (prod.id && p.id === prod.id) || (item.sku && p.sku === item.sku)
      );

      const resolvedName =
        item.productName ||
        prod.name ||
        item.name ||
        matched?.name ||
        (item.category ? `Item ${item.category}` : `Produk ${idx + 1}`);

      const resolvedSku = item.sku || prod.sku || matched?.sku || '-';

      let resolvedCat = item.category || prod.category || matched?.category;
      if (!resolvedCat || resolvedCat === 'Lainnya' || resolvedCat === 'Umum') {
        const lower = resolvedName.toLowerCase();
        const skuLower = resolvedSku.toLowerCase();
        if (lower.includes('mukena') || skuLower.includes('mkn')) {
          resolvedCat = 'Mukena';
        } else if (
          lower.includes('hijab') ||
          lower.includes('pashmina') ||
          lower.includes('voal') ||
          lower.includes('paris') ||
          lower.includes("syar'i") ||
          skuLower.includes('hjb')
        ) {
          resolvedCat = 'Hijab';
        } else if (lower.includes('gamis') || skuLower.includes('gms')) {
          resolvedCat = 'Gamis';
        } else {
          resolvedCat = resolvedCat || 'Lainnya';
        }
      }

      const unitPrice = Number(item.unitPrice ?? item.price ?? prod.priceRetail ?? matched?.priceRetail ?? 0);

      return {
        id: item.id || `item-${idx}-${Date.now()}`,
        productId: matched?.id || item.productId || prod.id || `prod-${idx}`,
        productName: resolvedName,
        sku: resolvedSku,
        category: resolvedCat,
        quantity: Math.max(1, Number(item.quantity || 1)),
        unitPrice,
        discountAmount: Number(item.discountAmount || 0),
        selectedPriceType: item.selectedPriceType || 'retail',
        unit: item.unit || prod.unit || matched?.unit || 'pcs',
        notes: item.notes || item.colorName || '',
        productRef: matched || (prod.id ? prod : undefined),
      };
    });
  });

  // Calculate totals dynamically
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineTotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
      return sum + lineTotal;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountTotal);
  }, [subtotal, discountTotal]);

  const changeAmount = useMemo(() => {
    if (paymentMethod === 'cash') {
      return Math.max(0, cashPaid - grandTotal);
    }
    return 0;
  }, [paymentMethod, cashPaid, grandTotal]);

  // Handle Item Modifications
  const handleQuantityChange = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const newQty = Math.max(1, current.quantity + delta);
      next[index] = { ...current, quantity: newQty };
      return next;
    });
  };

  const handleQuantityDirect = (index: number, qty: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: Math.max(1, qty) };
      return next;
    });
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        unitPrice: Math.max(0, newPrice),
        selectedPriceType: 'custom',
      };
      return next;
    });
  };

  const handlePriceTypeChange = (index: number, type: 'retail' | 'grosir') => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const prod = item.productRef || products.find((p) => p.id === item.productId);
      if (prod) {
        const price = type === 'grosir' ? prod.priceGrosir : prod.priceRetail;
        next[index] = {
          ...item,
          selectedPriceType: type,
          unitPrice: price,
        };
      } else {
        next[index] = {
          ...item,
          selectedPriceType: type,
        };
      }
      return next;
    });
  };

  // Switch product for a specific item row
  const handleSelectProductForItem = (index: number, newProdId: string) => {
    const prod = products.find((p) => p.id === newProdId);
    if (!prod) return;

    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const price = current.selectedPriceType === 'grosir' ? prod.priceGrosir : prod.priceRetail;
      next[index] = {
        ...current,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        category: prod.category || 'Hijab',
        unitPrice: price,
        unit: prod.unit || 'pcs',
        productRef: prod,
      };
      return next;
    });
  };

  const handleItemProductNameChange = (index: number, name: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], productName: name };
      return next;
    });
  };

  const handleItemCategoryChange = (index: number, category: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], category };
      return next;
    });
  };

  const handleItemDiscountChange = (index: number, disc: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], discountAmount: Math.max(0, disc) };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Transaksi harus memiliki minimal 1 barang.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!selectedProductIdToAdd) return;
    const prod = products.find((p) => p.id === selectedProductIdToAdd);
    if (!prod) return;

    // Check if already in items
    const existingIndex = items.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      handleQuantityChange(existingIndex, 1);
      setSelectedProductIdToAdd('');
      return;
    }

    const newItem: EditableItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category || 'Hijab',
      quantity: 1,
      unitPrice: prod.priceRetail,
      discountAmount: 0,
      selectedPriceType: 'retail',
      unit: prod.unit || 'pcs',
      notes: '',
      productRef: prod,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProductIdToAdd('');
  };

  // Submit and Save
  const handleSave = () => {
    if (items.length === 0) {
      alert('Harap masukkan minimal satu barang dalam transaksi!');
      return;
    }

    // Verify all items have valid names
    for (const item of items) {
      if (!item.productName || !item.productName.trim()) {
        alert('Setiap barang harus memiliki nama produk yang jelas!');
        return;
      }
    }

    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
      const newDateObj = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
      const newIsoDate = !isNaN(newDateObj.getTime()) ? newDateObj.toISOString() : transaction.date;

      const outlet = outlets.find((o) => o.id === selectedOutletId);
      const bazaar = bazaars.find((b) => b.id === selectedBazaarId);

      let chName = 'Toko Offline';
      if (channelType === 'bazaar') chName = bazaar ? `Bazaar: ${bazaar.name}` : 'Bazaar / Event';
      else if (channelType === 'whatsapp') chName = 'WhatsApp / Online';
      else if (channelType === 'marketplace') chName = 'Shopee / Marketplace';

      // Transform items with full properties (avoid any undefined)
      const savedItems = items.map((item) => {
        const prod = item.productRef || products.find((p) => p.id === item.productId) || {
          id: item.productId,
          sku: item.sku,
          barcode: '',
          name: item.productName,
          category: item.category,
          hpp: 0,
          priceRetail: item.unitPrice,
          priceGrosir: item.unitPrice,
          stockToko: 0,
          minStockAlert: 5,
          unit: item.unit || 'pcs',
        };

        const itemSubtotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);

        return {
          productId: prod.id || item.productId,
          productName: item.productName.trim(),
          name: item.productName.trim(),
          sku: item.sku || prod.sku || '-',
          category: item.category || prod.category || 'Lainnya',
          colorName: item.notes || (prod as any).colorName,
          price: item.unitPrice,
          unitPrice: item.unitPrice,
          appliedPrice: item.unitPrice,
          selectedPriceType: item.selectedPriceType,
          discountAmount: item.discountAmount || 0,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          hpp: (prod as any).hpp || 0,
          unit: item.unit || prod.unit || 'pcs',
          notes: item.notes || '',
          product: {
            ...prod,
            id: prod.id || item.productId,
            name: item.productName.trim(),
            sku: item.sku || prod.sku || '-',
            category: item.category || prod.category || 'Lainnya',
            priceRetail: item.unitPrice,
          },
        };
      });

      const totalItemsCount = items.reduce((sum, it) => sum + it.quantity, 0);

      const updatedTx: SaleTransaction = {
        ...transaction,
        date: newIsoDate,
        customerName: customerName.trim() || 'Pelanggan Umum',
        customerPhone: customerPhone.trim() || undefined,
        customerType: transaction.customerType || 'umum',
        cashier: cashier.trim() || 'Kasir',
        operator: cashier.trim() || 'Kasir',
        paymentMethod,
        cashPaid: paymentMethod === 'cash' ? cashPaid : grandTotal,
        changeAmount: paymentMethod === 'cash' ? Math.max(0, cashPaid - grandTotal) : 0,
        subtotal,
        discountTotal,
        discount: discountTotal,
        total: grandTotal,
        grandTotal,
        totalItems: totalItemsCount,
        items: savedItems,
        notes: notes.trim() || undefined,
        salesChannelType: channelType,
        salesChannelName: chName,
        channelName: chName,
        outletId: outlet?.id || transaction.outletId,
        outletName: outlet?.name || transaction.outletName,
        stockDeductedOutletId: outlet?.id || transaction.stockDeductedOutletId,
        stockDeductedLocationName: outlet?.name || transaction.stockDeductedLocationName,
        bazaarId: channelType === 'bazaar' ? bazaar?.id : undefined,
        bazaarName: channelType === 'bazaar' ? bazaar?.name : undefined,
      };

      onSave(updatedTx);
      onClose();
    } catch (err) {
      console.error('Error updating transaction:', err);
      alert('Gagal menyimpan perubahan transaksi. Periksa kembali format input.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">Edit Data Transaksi</h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/15 text-amber-300 font-bold tracking-wide">
                  {transaction.transactionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formulir lengkap untuk mengedit tanggal, produk, pelanggan, saluran, & pembayaran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          
          {/* Info Banner */}
          <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Penyesuaian Data Transaksi</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Perubahan nama barang, kategori, kuantitas, atau outlet stok akan langsung disinkronkan ke database dan laporan penjualan.
              </p>
            </div>
          </div>

          {/* Section 1: Tanggal & Waktu Transaksi */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Tanggal & Jam Transaksi
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setDateStr(toDateInputString(now));
                    setTimeStr(toTimeInputString(now));
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                >
                  ⚡ Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDateStr(toDateInputString(d));
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                >
                  📅 Kemarin
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-xs">Pilih Tanggal:</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-xs">Pilih Waktu / Jam:</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pelanggan & Kasir */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Nama Pelanggan:
              </label>
              <input
                type="text"
                placeholder="Pelanggan Umum"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                No. WhatsApp / Telepon:
              </label>
              <input
                type="text"
                placeholder="0812xxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-slate-500" />
                Petugas / Kasir:
              </label>
              <input
                type="text"
                placeholder="Nama Kasir"
                value={cashier}
                onChange={(e) => setCashier(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Saluran Penjualan & Lokasi Pemotongan Stok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                <Tent className="w-3.5 h-3.5 text-amber-600" />
                Saluran Penjualan:
              </label>
              <select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="toko">🏪 Toko Offline</option>
                <option value="bazaar">🎪 Bazaar / Event Pameran</option>
                <option value="whatsapp">📱 WhatsApp / Online Order</option>
                <option value="marketplace">🛍️ Shopee / Marketplace</option>
              </select>
            </div>

            {channelType === 'bazaar' ? (
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                  <Tent className="w-3.5 h-3.5 text-amber-600" />
                  Pilih Event Bazaar:
                </label>
                <select
                  value={selectedBazaarId}
                  onChange={(e) => setSelectedBazaarId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Pilih Bazaar --</option>
                  {bazaars.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.location})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  Outlet / Lokasi Pemotongan Stok:
                </label>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code}) {o.isDefault ? '- Toko Utama' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 4: Rincian Produk & Kuantitas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Daftar Produk Transaksi ({items.length} Barang)
              </span>
              <span className="text-[11px] text-slate-500">
                Pilih produk dari katalog atau ubah detail secara langsung
              </span>
            </div>

            {/* List of items */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {items.map((item, idx) => {
                const itemLineSubtotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
                return (
                  <div key={item.id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-3">
                    
                    {/* Top Row: Product Selector / Title & Category */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex-1 space-y-1">
                        {/* Selector to switch catalog product */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Produk #{idx + 1}:</span>
                          <select
                            value={item.productId}
                            onChange={(e) => handleSelectProductForItem(idx, e.target.value)}
                            className="w-full max-w-sm px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value={item.productId}>
                              {item.productName} ({item.sku})
                            </option>
                            {products
                              .filter((p) => p.id !== item.productId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) - {formatRupiah(p.priceRetail)}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Inline Name and Category Inputs */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemProductNameChange(idx, e.target.value)}
                            placeholder="Nama Produk"
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
                            title="Edit nama produk jika perlu"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => handleItemCategoryChange(idx, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:ring-1 focus:ring-amber-500"
                            title="Kategori Produk"
                          >
                            <option value="Hijab">🧕 Hijab</option>
                            <option value="Mukena">🥻 Mukena</option>
                            <option value="Gamis">👗 Gamis</option>
                            <option value="Aksesoris">💍 Aksesoris</option>
                            <option value="Lainnya">📦 Lainnya</option>
                          </select>
                        </div>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="self-end sm:self-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus barang dari transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity & Price Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-center pt-2 border-t border-slate-100">
                      
                      {/* Quantity counter */}
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Jumlah ({item.unit})</label>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, -1)}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-lg flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityDirect(idx, Number(e.target.value) || 1)}
                            className="w-12 text-center font-bold text-slate-900 text-xs px-1 py-1 border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, 1)}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-lg flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price Type (Retail / Grosir) */}
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipe Harga</label>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handlePriceTypeChange(idx, 'retail')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              item.selectedPriceType === 'retail'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Retail
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePriceTypeChange(idx, 'grosir')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              item.selectedPriceType === 'grosir'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Grosir
                          </button>
                        </div>
                      </div>

                      {/* Price Per Unit Input */}
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Harga Satuan (Rp)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(idx, Number(e.target.value) || 0)}
                          className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {/* Item Discount */}
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Diskon Item (Rp)</label>
                        <input
                          type="number"
                          value={item.discountAmount}
                          onChange={(e) => handleItemDiscountChange(idx, Number(e.target.value) || 0)}
                          className="w-full mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-amber-500"
                          placeholder="0"
                        />
                      </div>

                      {/* Subtotal Line */}
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Total Barang</label>
                        <div className="mt-1 font-black text-slate-900 text-sm">
                          {formatRupiah(itemLineSubtotal)}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add more products */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedProductIdToAdd}
                onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Tambah Produk Lain ke Transaksi Ini --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) - {formatRupiah(p.priceRetail)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedProductIdToAdd}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Produk
              </button>
            </div>
          </div>

          {/* Section 5: Pembayaran, Diskon Transaksi & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            
            {/* Left Column: Payment Method & Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Metode Pembayaran:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="cash">💵 Tunai / Cash</option>
                  <option value="qris">📱 QRIS</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                  <option value="debit">💳 Kartu Debit</option>
                  <option value="credit">💳 Kartu Kredit</option>
                </select>
              </div>

              {/* If cash: show cashPaid and change */}
              {paymentMethod === 'cash' && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Uang Diterima / Dibayar (Rp):
                    </label>
                    <input
                      type="number"
                      value={cashPaid}
                      onChange={(e) => setCashPaid(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCashPaid(grandTotal)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPaid(50000)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      50rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPaid(100000)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      100rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPaid(200000)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      200rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashPaid(500000)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      500rb
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-amber-200/60 text-xs">
                    <span className="text-amber-800 font-semibold">Kembalian:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {formatRupiah(changeAmount)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Catatan Transaksi:
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan pesanan, varian, atau alasan perubahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Right Column: Global Discounts & Calculation Breakdown */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-rose-500" />
                  Diskon Transaksi Global (Rp):
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={discountTotal}
                  onChange={(e) => setDiscountTotal(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs shadow-2xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} pcs):</span>
                  <span className="font-bold text-slate-900">{formatRupiah(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon Nota:</span>
                    <span className="font-bold">-{formatRupiah(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-900 text-sm">Total Akhir:</span>
                  <span className="font-black text-emerald-700 text-lg sm:text-xl">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Transaksi
          </button>
        </div>

      </div>
    </div>
  );
};
