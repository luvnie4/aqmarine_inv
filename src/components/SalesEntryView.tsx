import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Check, 
  Store, 
  Sparkles, 
  Package,
  Tag, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Receipt,
  MessageCircle,
  Tent,
  ShoppingBag,
  Building2,
  HelpCircle,
  CheckCircle2,
  ArrowDownToLine,
  Phone,
  Image as ImageIcon,
  Eye,
  MapPin,
  Calendar,
  Clock,
  RotateCcw,
  CalendarDays,
  Edit3
} from 'lucide-react';
import { 
  Product, 
  CartItem, 
  PaymentMethod, 
  SaleTransaction, 
  StoreOutlet, 
  SalesChannel, 
  SalesChannelType,
  BazaarEvent,
  UserAccount
} from '../types';
import { formatRupiah, formatNumber, generateTransactionCode, toDateInputString, toTimeInputString, formatDateTime } from '../utils/formatters';
import { getOutlets, getChannels, getDefaultOutlet, getProductOutletStock } from '../utils/outletStorage';
import { getBazaarEvents, getActiveBazaar, setActiveBazaarEvent } from '../utils/bazaarStorage';
import { ManageOutletsModal } from './ManageOutletsModal';
import { ManageChannelsModal } from './ManageChannelsModal';
import { ManageBazaarsModal } from './ManageBazaarsModal';
import { ProductPhotoGalleryModal } from './ProductPhotoGalleryModal';
import { getProductImages, getProductMainImage } from '../data/productPhotoPresets';

interface SalesEntryViewProps {
  products: Product[];
  currentUser?: UserAccount | null;
  onCompleteSale?: (transaction: SaleTransaction) => void;
  onCompleteTransaction?: (transaction: SaleTransaction) => void;
  onOpenAddProduct?: () => void;
  onLoadSampleData?: () => void;
  onOpenManageOutlets?: () => void;
  onOpenManageChannels?: () => void;
  onOpenManageBazaars?: () => void;
}

export const SalesEntryView: React.FC<SalesEntryViewProps> = ({ 
  products, 
  currentUser,
  onCompleteSale,
  onCompleteTransaction,
  onOpenAddProduct,
  onLoadSampleData,
  onOpenManageOutlets,
  onOpenManageChannels,
  onOpenManageBazaars
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Hijab' | 'Mukena'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Photo Gallery Modal State
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handleOpenGallery = (product: Product, e?: React.MouseEvent, index = 0) => {
    if (e) e.stopPropagation();
    setGalleryProduct(product);
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };
  
  // Outlets & Sales Channels State
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [bazaars, setBazaars] = useState<BazaarEvent[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [selectedBazaarId, setSelectedBazaarId] = useState<string>('');
  const [activeChannelType, setActiveChannelType] = useState<SalesChannelType>('toko');
  const [selectedCustomChannelId, setSelectedCustomChannelId] = useState<string>('');
  
  // Modals
  const [isOutletsModalOpen, setIsOutletsModalOpen] = useState(false);
  const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
  const [isBazaarsModalOpen, setIsBazaarsModalOpen] = useState(false);

  // Channel-specific Attributes
  const [bazaarName, setBazaarName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Simple Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  
  // Optional Extras
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [operatorName, setOperatorName] = useState(currentUser?.name || 'Staff Penjualan');

  // Date & Time Adjustment State
  const [saleDate, setSaleDate] = useState<string>(() => toDateInputString(new Date()));
  const [saleTime, setSaleTime] = useState<string>(() => toTimeInputString(new Date()));
  const [isCustomDateActive, setIsCustomDateActive] = useState<boolean>(false);

  const handleSetToday = () => {
    const now = new Date();
    setSaleDate(toDateInputString(now));
    setSaleTime(toTimeInputString(now));
    setIsCustomDateActive(false);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSaleDate(toDateInputString(d));
    setIsCustomDateActive(true);
  };

  const handleDateChange = (val: string) => {
    setSaleDate(val);
    const todayStr = toDateInputString(new Date());
    setIsCustomDateActive(val !== todayStr);
  };

  const handleTimeChange = (val: string) => {
    setSaleTime(val);
  };

  useEffect(() => {
    if (currentUser?.name) {
      setOperatorName(currentUser.name);
    }
  }, [currentUser]);

  // Success Feedback
  const [lastSavedTxNumber, setLastSavedTxNumber] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const showWarning = (msg: string) => {
    setWarningMessage(msg);
    setTimeout(() => {
      setWarningMessage(null);
    }, 3500);
  };

  // Load Outlets, Channels, & Bazaars on mount
  const refreshOutletsAndChannels = () => {
    const loadedOutlets = getOutlets();
    const loadedChannels = getChannels();
    const loadedBazaars = getBazaarEvents();
    
    setOutlets(loadedOutlets);
    setChannels(loadedChannels);
    setBazaars(loadedBazaars);

    if (loadedOutlets.length > 0 && !selectedOutletId) {
      const def = loadedOutlets.find(o => o.isDefault) || loadedOutlets[0];
      setSelectedOutletId(def.id);
    }

    if (loadedBazaars.length > 0) {
      const activeB = loadedBazaars.find(b => b.isActive) || loadedBazaars[0];
      setSelectedBazaarId(activeB.id);
      setBazaarName(activeB.name);
    } else {
      setSelectedBazaarId('');
      setBazaarName('');
    }
  };

  useEffect(() => {
    refreshOutletsAndChannels();

    const handleBazaarUpdated = () => {
      const loadedBazaars = getBazaarEvents();
      setBazaars(loadedBazaars);
      if (loadedBazaars.length > 0) {
        const activeB = loadedBazaars.find(b => b.isActive) || loadedBazaars[0];
        setSelectedBazaarId(activeB.id);
        setBazaarName(activeB.name);
      } else {
        setSelectedBazaarId('');
        setBazaarName('');
      }
    };

    const handleOutletUpdated = () => {
      const loadedOutlets = getOutlets();
      setOutlets(loadedOutlets);
    };

    window.addEventListener('bazaar_updated', handleBazaarUpdated);
    window.addEventListener('outlet_updated', handleOutletUpdated);
    window.addEventListener('storage', refreshOutletsAndChannels);

    return () => {
      window.removeEventListener('bazaar_updated', handleBazaarUpdated);
      window.removeEventListener('outlet_updated', handleOutletUpdated);
      window.removeEventListener('storage', refreshOutletsAndChannels);
    };
  }, []);

  // Primary Outlet object (Toko Pusat / TK-01)
  const primaryOutlet = useMemo(() => {
    return outlets.find(o => o.isDefault || o.code === 'TK-01') || outlets[0] || {
      id: 'outlet-main',
      name: 'Toko Utama AQMARINE',
      code: 'TK-01',
    };
  }, [outlets]);

  // Active Outlet object (for standard offline store channel)
  const activeOutlet = useMemo(() => {
    return outlets.find(o => o.id === selectedOutletId) || outlets[0] || {
      id: 'outlet-main',
      name: 'Toko Utama AQMARINE',
      code: 'TK-01',
    };
  }, [outlets, selectedOutletId]);

  // Active Bazaar object
  const activeBazaar = useMemo(() => {
    return bazaars.find(b => b.id === selectedBazaarId) || bazaars.find(b => b.isActive) || bazaars[0] || null;
  }, [bazaars, selectedBazaarId]);

  // Switch Bazaar
  const handleSelectBazaar = (bazaar: BazaarEvent) => {
    setSelectedBazaarId(bazaar.id);
    setBazaarName(bazaar.name);
  };

  // Adjust default settings when channel changes
  const handleSelectChannelType = (type: SalesChannelType) => {
    setActiveChannelType(type);
  };

  // Helper to get available stock of a product based on active channel and outlet
  // NOTE: Bazaar ALWAYS deducts and reads stock from Toko Pusat (TK-01)
  const getProductStock = (product: Product): number => {
    if (activeChannelType === 'bazaar') {
      return getProductOutletStock(product, primaryOutlet.id, outlets);
    }
    if (selectedOutletId) {
      return getProductOutletStock(product, selectedOutletId, outlets);
    }
    return product.stockToko || 0;
  };

  // Filter products for the active view
  const storeProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const query = searchTerm.toLowerCase().trim();
      if (!query) return matchCategory;
      
      const matchSearch =
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.colorName && p.colorName.toLowerCase().includes(query)) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // 1-Click Add to List
  const handleAddToCart = (product: Product) => {
    const availableStock = getProductStock(product);
    const locationLabel = activeChannelType === 'bazaar'
      ? `${primaryOutlet.name} (Bazaar)`
      : (activeOutlet?.name || 'Toko Utama');

    if (availableStock <= 0) {
      showWarning(`Stok produk "${product.name}" di ${locationLabel} kosong.`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      const appliedPrice = product.priceRetail;

      if (existing) {
        if (existing.quantity >= availableStock) {
          showWarning(`Stok di ${locationLabel} hanya tersisa ${availableStock} pcs.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.appliedPrice,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          product,
          quantity: 1,
          appliedPrice,
          subtotal: appliedPrice,
        },
      ];
    });
  };

  // Price Editing State
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');

  // Adjust Item Price manually
  const handleUpdateItemPrice = (productId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            appliedPrice: newPrice,
            subtotal: item.quantity * newPrice,
          };
        }
        return item;
      });
    });
  };

  // Adjust Quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const availableStock = getProductStock(item.product);
            const locationLabel = activeChannelType === 'bazaar'
              ? `${primaryOutlet.name} (Bazaar)`
              : (activeOutlet?.name || 'Toko Utama');
            const newQty = item.quantity + delta;

            if (newQty > availableStock) {
              showWarning(`Stok di ${locationLabel} hanya tersisa ${availableStock} pcs.`);
              return item;
            }
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.appliedPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove single item
  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear list
  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setNotes('');
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const finalDiscount = Math.min(discountAmount, rawSubtotal);
  const finalTotal = Math.max(0, rawSubtotal - finalDiscount);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Channel description helper
  const getChannelDisplayName = (): string => {
    if (activeChannelType === 'toko') return `Toko / Butik (${activeOutlet.name})`;
    if (activeChannelType === 'bazaar') return `Bazaar (${bazaarName.trim() || 'Event Pameran'})`;
    if (activeChannelType === 'whatsapp') return 'WhatsApp / Online Order';
    const ch = channels.find(c => c.id === selectedCustomChannelId);
    return ch ? ch.name : 'Saluran Penjualan Kustom';
  };

  // Save Sale Transaction
  const handleSaveSale = () => {
    if (cart.length === 0) {
      showWarning('Pilih minimal 1 produk untuk dicatat penjualannya.');
      return;
    }

    const isBazaarSale = activeChannelType === 'bazaar';
    const targetDeductedOutlet = isBazaarSale ? primaryOutlet : activeOutlet;
    const locationName = isBazaarSale
      ? `${primaryOutlet.name} (Bazaar: ${bazaarName.trim() || 'Event'})`
      : activeOutlet.name;
    const customChObj = channels.find(c => c.id === selectedCustomChannelId);

    // Calculate chosen transaction date & time
    let transactionIsoDate: string;
    try {
      const [year, month, day] = saleDate.split('-').map(Number);
      const [hours, minutes] = (saleTime || '12:00').split(':').map(Number);
      const chosenDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
      transactionIsoDate = !isNaN(chosenDate.getTime()) ? chosenDate.toISOString() : new Date().toISOString();
    } catch {
      transactionIsoDate = new Date().toISOString();
    }

    const txNumber = generateTransactionCode(transactionIsoDate);

    const transaction: SaleTransaction = {
      id: `tx-${Date.now()}`,
      transactionNumber: txNumber,
      date: transactionIsoDate,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        sku: c.product.sku,
        category: c.product.category,
        colorName: c.product.colorName,
        price: c.appliedPrice,
        hpp: c.product.hpp,
        quantity: c.quantity,
        subtotal: c.subtotal,
      })),
      subtotal: rawSubtotal,
      discount: finalDiscount,
      total: finalTotal,
      paymentMethod,
      customerType: 'umum',
      customerName: customerName.trim() || (activeChannelType === 'whatsapp' ? 'Customer WA' : 'Pelanggan Umum'),
      customerPhone: customerPhone.trim() || undefined,
      cashier: operatorName.trim() || 'Admin Penjualan',
      notes: notes.trim() || undefined,

      // Sales Channel & Multi-outlet attributes
      salesChannelType: activeChannelType,
      salesChannelName: getChannelDisplayName(),
      outletId: targetDeductedOutlet.id,
      outletName: isBazaarSale ? `${primaryOutlet.name} (Bazaar)` : activeOutlet.name,
      bazaarName: isBazaarSale ? (bazaarName.trim() || 'Bazaar AQMARINE') : undefined,
      customChannelName: activeChannelType === 'custom' ? (customChObj?.name || 'Saluran Kustom') : undefined,
      stockDeductedOutletId: targetDeductedOutlet.id,
      stockDeductedLocationName: locationName,
    };

    if (onCompleteTransaction) {
      onCompleteTransaction(transaction);
    } else if (onCompleteSale) {
      onCompleteSale(transaction);
    }
    setLastSavedTxNumber(txNumber);
    
    // Quick Reset
    setCart([]);
    setDiscountAmount(0);
    setCustomerName('');
    setNotes('');
    setShowOptionalDetails(false);
  };

  return (
    <div className="space-y-4 pb-16">
      
      {/* Warning Toast Banner */}
      {warningMessage && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="text-amber-700 hover:text-amber-950 text-xs font-bold ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {lastSavedTxNumber && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Transaksi <strong>{lastSavedTxNumber}</strong> berhasil disimpan ke database penjualan!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastSavedTxNumber(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP SALES CHANNEL & OUTLET SELECTOR BANNER */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-3.5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#9E6B70]/10 text-[#9E6B70]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Formulir Input Penjualan</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Database Penjualan & Potong Stok
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Catat transaksi penjualan langsung dari Toko Butik, Bazaar Event, WhatsApp, atau Saluran Lainnya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="manage-outlets-btn"
              type="button"
              onClick={() => setIsOutletsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-all active:scale-95"
            >
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kelola Toko Butik</span>
            </button>

            <button
              id="manage-bazaars-btn"
              type="button"
              onClick={() => setIsBazaarsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-all active:scale-95"
            >
              <Tent className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Kelola Bazaar Event</span>
            </button>

            <button
              id="manage-channels-btn"
              type="button"
              onClick={() => setIsChannelsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95"
            >
              <Tag className="w-3.5 h-3.5 text-[#9D6C72]" />
              <span>+ Tambah Saluran</span>
            </button>
          </div>
        </div>

        {/* 4 Main Sales Channel Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          
          {/* Tab 1: Toko Butik Offline */}
          <button
            type="button"
            onClick={() => handleSelectChannelType('toko')}
            className={`p-3 rounded-2xl border text-left transition-all relative ${
              activeChannelType === 'toko'
                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-xl bg-emerald-600 text-white w-fit">
                <Store className="w-4 h-4" />
              </div>
              {activeChannelType === 'toko' && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 block">Toko / Butik</span>
              <span className="text-[11px] text-emerald-700 font-semibold truncate block">
                {activeOutlet.name}
              </span>
            </div>
          </button>

          {/* Tab 2: Bazaar / Event */}
          <button
            type="button"
            onClick={() => handleSelectChannelType('bazaar')}
            className={`p-3 rounded-2xl border text-left transition-all relative ${
              activeChannelType === 'bazaar'
                ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-xl bg-amber-500 text-white w-fit">
                <Tent className="w-4 h-4" />
              </div>
              {activeChannelType === 'bazaar' && (
                <span className="w-2 h-2 rounded-full bg-amber-600" />
              )}
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 block">Bazaar / Event</span>
              <span className="text-[11px] text-amber-800 font-bold truncate block">
                {activeBazaar?.name || bazaarName || 'Pilih Bazaar'}
              </span>
            </div>
          </button>

          {/* Tab 3: WhatsApp / Chat */}
          <button
            type="button"
            onClick={() => handleSelectChannelType('whatsapp')}
            className={`p-3 rounded-2xl border text-left transition-all relative ${
              activeChannelType === 'whatsapp'
                ? 'bg-green-50/80 border-green-500 ring-2 ring-green-500/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-xl bg-green-600 text-white w-fit">
                <MessageCircle className="w-4 h-4" />
              </div>
              {activeChannelType === 'whatsapp' && (
                <span className="w-2 h-2 rounded-full bg-green-600" />
              )}
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 block">WhatsApp / Chat</span>
              <span className="text-[11px] text-green-700 font-semibold truncate block">
                Order Online WA
              </span>
            </div>
          </button>

          {/* Tab 4: Saluran Lainnya / Marketplace */}
          <button
            type="button"
            onClick={() => handleSelectChannelType('custom')}
            className={`p-3 rounded-2xl border text-left transition-all relative ${
              activeChannelType === 'custom'
                ? 'bg-rose-50/80 border-[#9D6C72] ring-2 ring-[#9D6C72]/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-xl bg-[#9D6C72] text-white w-fit">
                <ShoppingBag className="w-4 h-4" />
              </div>
              {activeChannelType === 'custom' && (
                <span className="w-2 h-2 rounded-full bg-[#9D6C72]" />
              )}
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 block">Saluran Lainnya</span>
              <span className="text-[11px] text-[#9D6C72] font-semibold truncate block">
                Shopee / Web / Kustom
              </span>
            </div>
          </button>

        </div>

        {/* Dynamic Channel Configuration Card */}
        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 space-y-2">
          
          {/* Toko Offline Config */}
          {activeChannelType === 'toko' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-700 shrink-0">Toko / Outlet Aktif:</span>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} ({outlet.code})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsOutletsModalOpen(true)}
                  className="text-[11px] text-emerald-700 hover:underline font-bold"
                >
                  + Tambah Toko
                </button>
              </div>

              <div className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                Stok Terpotong: {activeOutlet.name}
              </div>
            </div>
          )}

          {/* Bazaar Config */}
          {activeChannelType === 'bazaar' && (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <div className="p-1 bg-amber-500 text-white rounded-lg shrink-0">
                    <Tent className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-700 shrink-0">Nama Bazaar:</span>
                  
                  {/* Select from saved Bazaars */}
                  {bazaars.length > 0 ? (
                    <select
                      value={selectedBazaarId}
                      onChange={(e) => {
                        const b = bazaars.find(item => item.id === e.target.value);
                        if (b) {
                          handleSelectBazaar(b);
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-bold text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    >
                      {bazaars.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.location ? `(${b.location})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-amber-800 font-semibold italic text-[11px] bg-amber-100/70 px-2 py-1 rounded-lg">
                      Belum ada event bazaar
                    </span>
                  )}

                  {/* Button to open Add/Manage Bazaar Modal */}
                  <button
                    type="button"
                    onClick={() => setIsBazaarsModalOpen(true)}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[11px] rounded-xl flex items-center gap-1 shadow-xs transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tambah Bazaar Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBazaarsModalOpen(true)}
                    className="text-[11px] text-amber-800 hover:underline font-bold flex items-center gap-1"
                    title="Kelola semua event bazaar"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Kelola Semua Event</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/80 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs">
                  <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Potong Stok: <strong>{primaryOutlet.name} ({primaryOutlet.code})</strong></span>
                  <span className="text-[10px] text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded font-bold ml-0.5">Otomatis Toko Pusat</span>
                </div>
              </div>

              {/* Quick Pills of all Bazaars + Info line */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 font-semibold">Pilihan Cepat:</span>
                  {bazaars.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBazaar(b)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        b.id === selectedBazaarId
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-400'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>

                {activeBazaar && (
                  <div className="flex items-center gap-2 text-slate-500">
                    {activeBazaar.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <strong className="text-slate-700">{activeBazaar.location}</strong>
                      </span>
                    )}
                    {activeBazaar.picName && (
                      <span>• PIC: <strong className="text-slate-700">{activeBazaar.picName}</strong></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WhatsApp Config */}
          {activeChannelType === 'whatsapp' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <Phone className="w-4 h-4 text-green-600 shrink-0" />
                <span className="font-bold text-slate-700 shrink-0">No. WhatsApp Customer:</span>
                <input
                  type="text"
                  placeholder="08123456789 (Opsional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 flex-1 max-w-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Ambil dari Toko:</span>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={`wa-out-${o.id}`} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom Channel Config */}
          {activeChannelType === 'custom' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <ShoppingBag className="w-4 h-4 text-[#9D6C72] shrink-0" />
                <span className="font-bold text-slate-700 shrink-0">Pilih Saluran:</span>
                <select
                  value={selectedCustomChannelId}
                  onChange={(e) => setSelectedCustomChannelId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-[#9D6C72] focus:outline-none focus:ring-1 focus:ring-[#9D6C72]"
                >
                  {channels.filter(c => c.type === 'custom').map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsChannelsModalOpen(true)}
                  className="text-[11px] text-[#9D6C72] hover:underline font-bold"
                >
                  + Tambah Saluran Baru
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Ambil dari Toko:</span>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={`cust-out-${o.id}`} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Notification Toast if sale was just recorded */}
      {lastSavedTxNumber && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Penjualan nomor <strong>{lastSavedTxNumber}</strong> berhasil disimpan & stok otomatis terpotong!
            </span>
          </div>
          <button
            onClick={() => setLastSavedTxNumber(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCT SELECTOR & SALE ENTRY GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Section: Product Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search and Category Filter */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Pilih Produk:</span>
                <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded-md">
                  Sumber Stok: <strong className="text-slate-900">{activeOutlet.name}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenAddProduct && (
                  <button
                    type="button"
                    onClick={onOpenAddProduct}
                    className="px-2.5 py-1 bg-[#9E6B70] hover:bg-[#8B5559] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tambah Produk</span>
                  </button>
                )}
                <div className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                  Stok Tersedia
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pos-search-input"
                type="text"
                placeholder="Cari nama hijab, mukena, SKU, atau warna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20 focus:border-[#9E6B70]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({products.length})
              </button>
              <button
                onClick={() => setSelectedCategory('Hijab')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'Hijab'
                    ? 'bg-[#9E6B70] text-white'
                    : 'bg-rose-50 text-[#9E6B70] hover:bg-rose-100'
                }`}
              >
                Hijab
              </button>
              <button
                onClick={() => setSelectedCategory('Mukena')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'Mukena'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Mukena
              </button>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="col-span-full py-12 px-6 text-center bg-white rounded-3xl border border-dashed border-rose-200 text-slate-600 shadow-xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-[#9E6B70] flex items-center justify-center mx-auto shadow-xs">
                  <Package className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h4 className="text-base font-bold text-slate-800">
                    Katalog Produk Masih Kosong (0 Produk)
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Untuk mencatat transaksi penjualan di kasir, tambahkan produk hijab & mukena terlebih dahulu, atau muat data sampel butik untuk langsung mencoba.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {onOpenAddProduct && (
                    <button
                      type="button"
                      onClick={onOpenAddProduct}
                      className="px-4 py-2.5 bg-[#9E6B70] hover:bg-[#8B5559] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Tambah Produk Baru</span>
                    </button>
                  )}
                  {onLoadSampleData && (
                    <button
                      type="button"
                      onClick={onLoadSampleData}
                      className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>+ Muat Data Contoh Butik</span>
                    </button>
                  )}
                </div>
              </div>
            ) : storeProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 space-y-2">
                <Tag className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-700">Tidak ada produk yang cocok</p>
                <p className="text-[11px] text-slate-500">
                  {searchTerm ? `Tidak ditemukan produk dengan kata kunci "${searchTerm}".` : 'Tidak ada produk dalam kategori ini.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="mt-2 text-xs text-[#9E6B70] font-bold hover:underline"
                >
                  Reset Filter & Pencarian
                </button>
              </div>
            ) : (
              storeProducts.map((product) => {
                const availableStock = getProductStock(product);
                const isOutOfStock = availableStock <= 0;
                const inCart = cart.find((i) => i.product.id === product.id);
                const images = getProductImages(product);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleAddToCart(product)}
                    className={`rounded-2xl border transition-all relative flex flex-col justify-between select-none overflow-hidden group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : inCart
                        ? 'bg-rose-50/60 border-[#9E6B70] shadow-xs cursor-pointer hover:shadow-md ring-2 ring-[#9E6B70]'
                        : 'bg-white border-slate-200 hover:border-[#9E6B70]/60 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {/* Quantity Badge if in cart */}
                    {inCart && (
                      <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-[#9E6B70] text-white font-black text-xs flex items-center justify-center shadow-md">
                        {inCart.quantity}
                      </span>
                    )}

                    {/* Product Photo Thumbnail Preview */}
                    <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={getProductMainImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Photo count / Gallery trigger overlay button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenGallery(product, e, 0)}
                        title="Lihat Galeri Foto Produk"
                        className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 hover:bg-black/80 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-1 transition-colors"
                      >
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>{images.length}</span>
                      </button>

                      {/* Stock Pill on Photo */}
                      <div className="absolute top-1.5 left-1.5">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs backdrop-blur-xs ${
                          isOutOfStock
                            ? 'bg-red-600/90 text-white'
                            : availableStock <= product.minStockAlert
                            ? 'bg-amber-600/90 text-white'
                            : 'bg-emerald-600/90 text-white'
                        }`}>
                          {isOutOfStock ? 'Habis' : `Stok: ${availableStock}`}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold text-[#9E6B70]">
                            {product.category}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            {product.sku}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-800 text-xs line-clamp-2 leading-snug">
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs sm:text-sm font-black text-slate-900">
                          {formatRupiah(product.priceRetail)}
                        </div>

                        <span className="text-[10px] font-bold text-[#9E6B70] group-hover:underline">
                          + Tambah
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Section: Sale Entry Summary & Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-100 shadow-xl space-y-4 flex flex-col justify-between">
          
          <div className="space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#9E6B70]" />
                  <h3 className="text-base font-bold text-slate-800">
                    Daftar Item Penjualan ({totalItemsCount} pcs)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Tujuan Saluran: <strong>{getChannelDisplayName()}</strong>
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Kosongkan
                </button>
              )}
            </div>

            {/* Pengaturan Tanggal & Waktu Penjualan (Atur Tanggal) */}
            <div className={`p-3 rounded-2xl border transition-all ${
              isCustomDateActive 
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
                : 'bg-slate-50/90 border-slate-200/90 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className={`w-4 h-4 ${isCustomDateActive ? 'text-amber-700' : 'text-[#9E6B70]'}`} />
                  <span className="text-xs font-bold text-slate-800">Tanggal & Waktu Penjualan</span>
                </div>
                
                {isCustomDateActive ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      <span>🕒 Tanggal Khusus</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSetToday}
                      className="text-[10px] text-amber-900 font-bold hover:underline flex items-center gap-0.5"
                      title="Kembalikan ke waktu sekarang"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <span>⚡ Real-time (Hari Ini)</span>
                  </span>
                )}
              </div>

              {/* Date & Time Input Fields */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tanggal Transaksi:</label>
                  <input
                    id="sale-date-input"
                    type="date"
                    value={saleDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70] shadow-2xs"
                  />
                </div>

                <div className="col-span-5">
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Jam / Waktu:</label>
                  <input
                    id="sale-time-input"
                    type="time"
                    value={saleTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70] shadow-2xs"
                  />
                </div>
              </div>

              {/* Quick Presets & Formatted Indonesian Date */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      !isCustomDateActive && saleDate === toDateInputString()
                        ? 'bg-[#9E6B70] text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ⚡ Hari Ini
                  </button>

                  <button
                    type="button"
                    onClick={handleSetYesterday}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      isCustomDateActive
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    📅 Kemarin
                  </button>
                </div>

                <div className="text-[10px] text-slate-600 font-semibold truncate text-right">
                  {formatDateTime(
                    (() => {
                      try {
                        const [y, m, d] = saleDate.split('-').map(Number);
                        const [hh, mm] = (saleTime || '12:00').split(':').map(Number);
                        return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0).toISOString();
                      } catch {
                        return new Date().toISOString();
                      }
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="max-h-[220px] overflow-y-auto space-y-2 divide-y divide-slate-100 pr-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Belum ada item yang dipilih</p>
                  <p className="text-[11px]">Pilih produk di sebelah kiri untuk memasukkan ke catatan penjualan.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Mini Photo Thumbnail */}
                      <div 
                        onClick={(e) => handleOpenGallery(item.product, e, 0)}
                        className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:ring-1 hover:ring-[#9E6B70]"
                        title="Klik untuk melihat foto produk"
                      >
                        <img
                          src={getProductMainImage(item.product)}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {item.product.name}
                        </h4>

                        {/* Interactive Price Display & Editor */}
                        {editingPriceProductId === item.product.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-slate-500 font-bold">Rp</span>
                            <input
                              type="number"
                              autoFocus
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const p = parseInt(customPriceInput, 10);
                                  if (!isNaN(p)) handleUpdateItemPrice(item.product.id, p);
                                  setEditingPriceProductId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingPriceProductId(null);
                                }
                              }}
                              className="w-24 px-1.5 py-0.5 text-xs font-bold text-[#8C5559] border border-[#9E6B70] rounded-lg bg-rose-50 outline-none shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const p = parseInt(customPriceInput, 10);
                                if (!isNaN(p)) handleUpdateItemPrice(item.product.id, p);
                                setEditingPriceProductId(null);
                              }}
                              className="p-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors"
                              title="Simpan Perubahan Harga"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-700">{formatRupiah(item.appliedPrice)}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceProductId(item.product.id);
                                setCustomPriceInput(item.appliedPrice.toString());
                              }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 text-[#8C5559] hover:bg-rose-100 font-bold text-[10px] transition-colors border border-rose-200"
                              title="Klik untuk ubah harga manual"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Ubah Harga</span>
                            </button>
                            {item.appliedPrice !== item.product.priceRetail && (
                              <span className="text-amber-700 text-[10px] font-bold bg-amber-50 px-1 rounded border border-amber-200">
                                Manual
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="p-1 text-slate-600 hover:bg-slate-200 rounded-l-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="p-1 text-slate-600 hover:bg-slate-200 rounded-r-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[65px] text-xs font-black text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Simple Form Details & Payment */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                
                {/* Optional Details Toggle (Discount, Customer Name, Notes) */}
                <div>
                  <button
                    onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                    className="text-xs text-[#9E6B70] font-semibold flex items-center gap-1 hover:underline"
                  >
                    {showOptionalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showOptionalDetails ? 'Sembunyikan Opsi Form Tambahan' : '+ Tambah Nama Pembeli / Diskon / Catatan'}</span>
                  </button>

                  {showOptionalDetails && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Nama Pembeli..."
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9E6B70]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="number"
                          placeholder="Potongan / Diskon (Rp)..."
                          value={discountAmount || ''}
                          onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9E6B70]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Catatan Transaksi / Pengiriman..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9E6B70]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Summary Box */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal ({totalItemsCount} pcs):</span>
                    <span className="font-semibold text-slate-700">{formatRupiah(rawSubtotal)}</span>
                  </div>
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-xs text-rose-600 font-bold">
                      <span>Diskon:</span>
                      <span>-{formatRupiah(finalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-800">Total Penjualan:</span>
                    <span className="text-2xl font-black text-[#9E6B70]">{formatRupiah(finalTotal)}</span>
                  </div>
                </div>

                {/* 4 Simple Payment Methods */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Metode Pembayaran:</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        paymentMethod === 'cash'
                          ? 'bg-[#9E6B70] text-white border-[#9E6B70] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Tunai</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        paymentMethod === 'transfer'
                          ? 'bg-[#9E6B70] text-white border-[#9E6B70] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Transfer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        paymentMethod === 'qris'
                          ? 'bg-[#9E6B70] text-white border-[#9E6B70] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('debit')}
                      className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        paymentMethod === 'debit'
                          ? 'bg-[#9E6B70] text-white border-[#9E6B70] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Debit</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* 1-Click Save Sale into Database */}
          <div className="pt-3 border-t border-slate-100">
            <button
              id="save-sale-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={handleSaveSale}
              className={`w-full py-3.5 px-4 font-black rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#9E6B70] hover:bg-[#8B5559] text-white shadow-[#9E6B70]/30'
              }`}
            >
              <Check className="w-5 h-5" />
              <span>Simpan Catatan Penjualan ({formatRupiah(finalTotal)})</span>
            </button>
          </div>

        </div>

      </div>

      {/* Modals for Outlets and Channels */}
      <ManageOutletsModal
        isOpen={isOutletsModalOpen}
        onClose={() => {
          setIsOutletsModalOpen(false);
          refreshOutletsAndChannels();
        }}
        onUpdated={refreshOutletsAndChannels}
      />

      <ManageChannelsModal
        isOpen={isChannelsModalOpen}
        onClose={() => {
          setIsChannelsModalOpen(false);
          refreshOutletsAndChannels();
        }}
        onUpdated={refreshOutletsAndChannels}
      />

      {/* Bazaar & Event Manager Modal */}
      <ManageBazaarsModal
        isOpen={isBazaarsModalOpen}
        onClose={() => {
          setIsBazaarsModalOpen(false);
          refreshOutletsAndChannels();
        }}
        onSelectBazaar={(b) => {
          handleSelectBazaar(b);
        }}
        onUpdated={refreshOutletsAndChannels}
      />

      {/* Product Photo Gallery Modal */}
      <ProductPhotoGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        product={galleryProduct}
        initialPhotoIndex={galleryIndex}
      />

    </div>
  );
};
