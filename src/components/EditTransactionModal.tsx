import React, { useState, useMemo } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Store, 
  Tent, 
  CreditCard, 
  Trash2, 
  Plus, 
  FileEdit, 
  ShoppingBag,
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp
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
  onSave: (updatedTransaction: SaleTransaction) => void | Promise<void>;
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

  // Customer Info
  const [customerName, setCustomerName] = useState<string>(transaction.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(transaction.customerPhone || '');
  const [customerType, setCustomerType] = useState<string>(transaction.customerType || 'umum');
  const [customerAddress, setCustomerAddress] = useState<string>((transaction as any).customerAddress || '');

  // Cashier Info
  const [cashier, setCashier] = useState<string>(transaction.cashier || transaction.operator || 'Kasir');

  // Channel & Location
  const [channelType, setChannelType] = useState<string>(
    transaction.salesChannelType || 
    (transaction.bazaarId ? 'bazaar' : 'toko')
  );
  const [customChannelName, setCustomChannelName] = useState<string>(
    (transaction as any).customChannelName || transaction.salesChannelName || ''
  );
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    transaction.stockDeductedOutletId || transaction.outletId || (outlets[0]?.id || '')
  );
  const [selectedBazaarId, setSelectedBazaarId] = useState<string>(transaction.bazaarId || (bazaars[0]?.id || ''));

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.paymentMethod || 'cash');
  const [paymentRef, setPaymentRef] = useState<string>((transaction as any).paymentRef || '');
  const [cashPaid, setCashPaid] = useState<number>(
    transaction.cashPaid ?? transaction.cashReceived ?? transaction.total ?? 0
  );

  // Notes & Discounts
  const [discountTotal, setDiscountTotal] = useState<number>(transaction.discountTotal || transaction.discount || 0);
  const [notes, setNotes] = useState<string>(transaction.notes || '');

  // UI state for adding items
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>('');
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemCategory, setManualItemCategory] = useState('Hijab');
  const [manualItemPrice, setManualItemPrice] = useState<number>(0);
  const [manualItemQty, setManualItemQty] = useState<number>(1);
  const [manualItemSku, setManualItemSku] = useState('');

  // Status & Feedback
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
          resolvedCat = resolvedCat || 'Hijab';
        }
      }

      const unitPrice = Number(item.unitPrice || item.price || item.appliedPrice || matched?.priceRetail || 0);
      const discount = Number(item.discountAmount || item.discount || 0);
      const quantity = Math.max(1, Number(item.quantity || item.qty || 1));

      return {
        id: item.id || `item-${idx}-${Date.now()}`,
        productId: item.productId || prod.id || matched?.id || `prod-${idx}`,
        productName: resolvedName,
        sku: resolvedSku,
        category: resolvedCat,
        quantity,
        unitPrice,
        discountAmount: discount,
        selectedPriceType: (item.selectedPriceType as any) || (matched && unitPrice === matched.priceGrosir ? 'grosir' : 'retail'),
        unit: item.unit || prod.unit || matched?.unit || 'pcs',
        notes: item.notes || item.colorName || '',
        productRef: matched,
      };
    });
  });

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineSubtotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
      return sum + lineSubtotal;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountTotal);
  }, [subtotal, discountTotal]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, cashPaid - grandTotal);
  }, [paymentMethod, cashPaid, grandTotal]);

  // Item modifications
  const handleQuantityChange = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      const newQty = Math.max(1, next[index].quantity + delta);
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
    setSaveError(null);
  };

  const handleQuantityDirect = (index: number, val: number) => {
    const safeVal = Math.max(1, isNaN(val) ? 1 : val);
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: safeVal };
      return next;
    });
    setSaveError(null);
  };

  const handlePriceChange = (index: number, price: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], unitPrice: Math.max(0, price), selectedPriceType: 'custom' };
      return next;
    });
    setSaveError(null);
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
    setSaveError(null);
  };

  const handleItemProductNameChange = (index: number, name: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], productName: name };
      return next;
    });
    setSaveError(null);
  };

  const handleItemCategoryChange = (index: number, category: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], category };
      return next;
    });
  };

  const handleItemSkuChange = (index: number, sku: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], sku };
      return next;
    });
  };

  const handleItemNotesChange = (index: number, notes: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes };
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
      setSaveError('Transaksi harus memiliki minimal 1 barang belanja. Tidak dapat menghapus semua barang.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSaveError(null);
  };

  // Add from catalog
  const handleAddCatalogItem = () => {
    if (!selectedCatalogProductId) return;
    const prod = products.find((p) => p.id === selectedCatalogProductId);
    if (!prod) return;

    const existingIndex = items.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      handleQuantityChange(existingIndex, 1);
      setSelectedCatalogProductId('');
      return;
    }

    const newItem: EditableItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    setSelectedCatalogProductId('');
    setSaveError(null);
  };

  // Add manual item
  const handleAddManualItem = () => {
    if (!manualItemName.trim()) {
      setSaveError('Harap isi nama produk sebelum menambahkan barang kustom.');
      return;
    }

    const newItem: EditableItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: `custom-${Date.now()}`,
      productName: manualItemName.trim(),
      sku: manualItemSku.trim() || `AQM-CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      category: manualItemCategory || 'Hijab',
      quantity: Math.max(1, manualItemQty),
      unitPrice: Math.max(0, manualItemPrice),
      discountAmount: 0,
      selectedPriceType: 'custom',
      unit: 'pcs',
      notes: '',
    };

    setItems((prev) => [...prev, newItem]);
    setManualItemName('');
    setManualItemPrice(0);
    setManualItemQty(1);
    setManualItemSku('');
    setIsManualAddOpen(false);
    setSaveError(null);
  };

  // Submit and Save
  const handleSave = async () => {
    setSaveError(null);

    if (items.length === 0) {
      setSaveError('Harap masukkan minimal satu barang dalam transaksi!');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName || !item.productName.trim()) {
        setSaveError(`Barang #${i + 1} harus memiliki nama produk yang jelas!`);
        return;
      }
      if (item.quantity <= 0) {
        setSaveError(`Jumlah untuk "${item.productName}" harus minimal 1.`);
        return;
      }
    }

    try {
      setIsSaving(true);

      // Safe date construction
      let newIsoDate = transaction.date;
      if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
        const newDateObj = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
        if (!isNaN(newDateObj.getTime())) {
          newIsoDate = newDateObj.toISOString();
        }
      }

      const outlet = outlets.find((o) => o.id === selectedOutletId);
      const bazaar = bazaars.find((b) => b.id === selectedBazaarId);

      let chName = 'Toko Offline';
      if (channelType === 'bazaar') {
        chName = bazaar ? `Bazaar: ${bazaar.name}` : 'Bazaar / Event';
      } else if (channelType === 'whatsapp') {
        chName = 'WhatsApp / Online';
      } else if (channelType === 'marketplace') {
        chName = 'Shopee / Marketplace';
      } else if (channelType === 'custom') {
        chName = customChannelName.trim() || 'Saluran Kustom';
      }

      // Transform items with complete, sanitized properties
      const savedItems = items.map((item) => {
        const prod = item.productRef || products.find((p) => p.id === item.productId) || {
          id: item.productId,
          sku: item.sku || '-',
          barcode: '',
          name: item.productName.trim(),
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
          category: item.category || prod.category || 'Hijab',
          colorName: item.notes || (prod as any).colorName || '',
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
            category: item.category || prod.category || 'Hijab',
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
        customerType: customerType || 'umum',
        cashier: cashier.trim() || 'Kasir',
        operator: cashier.trim() || 'Kasir',
        paymentMethod,
        cashPaid: paymentMethod === 'cash' ? cashPaid : grandTotal,
        cashReceived: paymentMethod === 'cash' ? cashPaid : grandTotal,
        changeAmount: paymentMethod === 'cash' ? Math.max(0, cashPaid - grandTotal) : 0,
        cashChange: paymentMethod === 'cash' ? Math.max(0, cashPaid - grandTotal) : 0,
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
        outletId: outlet?.id || transaction.outletId || (outlets[0]?.id || 'outlet-main'),
        outletName: outlet?.name || transaction.outletName || 'Toko Utama',
        stockDeductedOutletId: outlet?.id || transaction.stockDeductedOutletId || (outlets[0]?.id || 'outlet-main'),
        stockDeductedLocationName: outlet?.name || transaction.stockDeductedLocationName || 'Toko Utama',
        bazaarId: channelType === 'bazaar' ? (bazaar?.id || selectedBazaarId) : undefined,
        bazaarName: channelType === 'bazaar' ? (bazaar?.name || undefined) : undefined,
      };

      // Add extra flexible metadata
      (updatedTx as any).customerAddress = customerAddress.trim() || undefined;
      (updatedTx as any).customChannelName = channelType === 'custom' ? customChannelName.trim() : undefined;
      (updatedTx as any).paymentRef = paymentRef.trim() || undefined;

      await onSave(updatedTx);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setIsSaving(false);
      setSaveError('Gagal menyimpan perubahan transaksi: ' + (err?.message || 'Periksa kembali data yang diinput'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">Edit Data Transaksi Lengkap</h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/15 text-amber-300 font-bold tracking-wide">
                  {transaction.transactionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ubah tanggal, barang belanja, kuantitas, harga, pelanggan, saluran, & pembayaran
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          
          {/* Error Banner if any */}
          {saveError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Perhatian: Data Belum Dapat Disimpan</p>
                <p className="text-rose-700 mt-0.5">{saveError}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSaveError(null)}
                className="text-rose-400 hover:text-rose-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

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
                  onChange={(e) => {
                    setDateStr(e.target.value);
                    setSaveError(null);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-xs">Pilih Waktu / Jam:</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => {
                    setTimeStr(e.target.value);
                    setSaveError(null);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Data Pelanggan & Petugas Kasir */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
              <User className="w-3.5 h-3.5 text-amber-600" />
              Data Pelanggan & Kasir
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
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
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Tipe Pelanggan:
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="umum">Umum / Retail</option>
                  <option value="grosir">Grosir / Reseller</option>
                  <option value="member">Member Aqmarine</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  No. WhatsApp / HP:
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
                  <Store className="w-3.5 h-3.5 text-slate-400" />
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

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Alamat / Keterangan Pelanggan:
              </label>
              <input
                type="text"
                placeholder="Alamat pengiriman / catatan pelanggan (opsional)..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Saluran Penjualan & Lokasi Pemotongan Stok */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
              <Tent className="w-3.5 h-3.5 text-amber-600" />
              Saluran Penjualan & Alokasi Stok
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
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
                  <option value="custom">✨ Kustom / Saluran Lainnya</option>
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
              ) : channelType === 'custom' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-xs">
                    Nama Saluran Kustom:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Reseller VIP, Pameran Mall..."
                    value={customChannelName}
                    onChange={(e) => setCustomChannelName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
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
          </div>

          {/* Section 4: Rincian Produk & Kuantitas */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Daftar Barang Belanja ({items.length} Macam Barang)
              </span>
              <span className="text-[11px] text-slate-500">
                Nama, SKU, kategori, harga, dan diskon barang dapat diedit langsung
              </span>
            </div>

            {/* List of items */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {items.map((item, idx) => {
                const itemLineSubtotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
                return (
                  <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-3">
                    
                    {/* Top Row: Switch Product or Edit Name & Category */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex-1 space-y-2">
                        {/* Selector to switch catalog product */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                            Barang #{idx + 1}:
                          </span>
                          <select
                            value={item.productId}
                            onChange={(e) => handleSelectProductForItem(idx, e.target.value)}
                            className="w-full max-w-sm px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

                        {/* Inline Name, Category, SKU, and Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-0.5">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemProductNameChange(idx, e.target.value)}
                              placeholder="Nama Produk"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-amber-500"
                              title="Edit nama produk jika perlu"
                            />
                          </div>
                          <div>
                            <select
                              value={item.category}
                              onChange={(e) => handleItemCategoryChange(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-amber-500"
                              title="Kategori Produk"
                            >
                              <option value="Hijab">🧕 Hijab</option>
                              <option value="Mukena">🥻 Mukena</option>
                              <option value="Gamis">👗 Gamis</option>
                              <option value="Aksesoris">💍 Aksesoris</option>
                              <option value="Lainnya">📦 Lainnya</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.sku}
                              onChange={(e) => handleItemSkuChange(idx, e.target.value)}
                              placeholder="SKU / Kode"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:ring-1 focus:ring-amber-500"
                              title="Kode SKU produk"
                            />
                          </div>
                        </div>

                        {/* Notes / Variant */}
                        <div>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                            placeholder="Catatan varian warna / motif / ukuran..."
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="self-end sm:self-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Hapus barang dari transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity & Price Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center pt-2.5 border-t border-slate-100">
                      
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

            {/* Actions for Adding More Items */}
            <div className="space-y-2 pt-1">
              {/* Option 1: Add from Catalog */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCatalogProductId}
                  onChange={(e) => setSelectedCatalogProductId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Tambah Produk dari Katalog Toko --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - {formatRupiah(p.priceRetail)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCatalogItem}
                  disabled={!selectedCatalogProductId}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah dari Katalog
                </button>
              </div>

              {/* Option 2: Add Manual / Custom Product Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                  className="text-xs font-bold text-[#9D6C72] hover:text-[#8B5E64] inline-flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isManualAddOpen ? 'Tutup Form Barang Bebas' : '+ Tambah Barang Bebas / Kustom (Tanpa Katalog)'}</span>
                  {isManualAddOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isManualAddOpen && (
                  <div className="mt-2 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
                    <p className="text-[11px] font-bold text-amber-900">
                      Input Barang Baru / Custom Langsung ke Transaksi:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Produk:</label>
                        <input
                          type="text"
                          placeholder="Nama Barang Kustom..."
                          value={manualItemName}
                          onChange={(e) => setManualItemName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kategori:</label>
                        <select
                          value={manualItemCategory}
                          onChange={(e) => setManualItemCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800"
                        >
                          <option value="Hijab">Hijab</option>
                          <option value="Mukena">Mukena</option>
                          <option value="Gamis">Gamis</option>
                          <option value="Aksesoris">Aksesoris</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Harga Satuan (Rp):</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={manualItemPrice || ''}
                          onChange={(e) => setManualItemPrice(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-600">Jumlah (Qty):</label>
                        <input
                          type="number"
                          min="1"
                          value={manualItemQty}
                          onChange={(e) => setManualItemQty(Math.max(1, Number(e.target.value) || 1))}
                          className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambahkan Barang Ini
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Pembayaran, Diskon Transaksi & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            
            {/* Left Column: Payment Method & Details */}
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

              {/* If non-cash, show reference input */}
              {paymentMethod !== 'cash' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">
                    Referensi / Bank / Bukti:
                  </label>
                  <input
                    type="text"
                    placeholder="Nama bank / no. referensi QRIS / debit..."
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* If cash: show cashPaid and quick change */}
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
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 text-xs shadow-2xs">
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
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Transaksi</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
