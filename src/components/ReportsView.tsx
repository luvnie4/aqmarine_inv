import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar, 
  Download, 
  Receipt, 
  Search,
  Eye,
  Store,
  Tent,
  MessageCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  PieChart as PieChartIcon,
  Edit2,
  Clock,
  RotateCcw,
  X
} from 'lucide-react';
import { SaleTransaction, Product } from '../types';
import { formatRupiah, formatDateTime, exportToCSV, toDateInputString, toTimeInputString } from '../utils/formatters';
import { getOutlets } from '../utils/outletStorage';
import { getBazaarEvents } from '../utils/bazaarStorage';

interface ReportsViewProps {
  transactions: SaleTransaction[];
  products: Product[];
  onViewReceipt: (transaction: SaleTransaction) => void;
  onUpdateTransaction?: (transaction: SaleTransaction) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  onViewReceipt,
  onUpdateTransaction,
}) => {
  const currentDate = new Date();
  const [timeframe, setTimeframe] = useState<'today' | 'last7' | 'this_month' | 'monthly' | 'custom_date' | 'all'>('monthly');
  const [filterCustomDate, setFilterCustomDate] = useState<string>(() => toDateInputString(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  
  // Channels: 'all' | 'toko' | 'bazaar' | 'whatsapp' | 'custom'
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [selectedBazaarName, setSelectedBazaarName] = useState<string>('all');
  
  // Category Filter: 'all' | 'Hijab' | 'Mukena' | 'Lainnya'
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Edit Transaction Date State
  const [editingTxDate, setEditingTxDate] = useState<SaleTransaction | null>(null);
  const [editInputDate, setEditInputDate] = useState<string>('');
  const [editInputTime, setEditInputTime] = useState<string>('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  const handleOpenEditDate = (tx: SaleTransaction) => {
    setEditingTxDate(tx);
    const txDate = tx.date ? new Date(tx.date) : new Date();
    setEditInputDate(toDateInputString(!isNaN(txDate.getTime()) ? txDate : new Date()));
    setEditInputTime(toTimeInputString(!isNaN(txDate.getTime()) ? txDate : new Date()));
  };

  const handleSaveDateChange = () => {
    if (!editingTxDate || !editInputDate) return;
    try {
      const [y, m, d] = editInputDate.split('-').map(Number);
      const [hh, mm] = (editInputTime || '12:00').split(':').map(Number);
      const newDateObj = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
      const newIso = !isNaN(newDateObj.getTime()) ? newDateObj.toISOString() : editingTxDate.date;
      
      const updatedTx: SaleTransaction = {
        ...editingTxDate,
        date: newIso,
      };

      if (onUpdateTransaction) {
        onUpdateTransaction(updatedTx);
      }

      setEditSuccessMsg(`Tanggal transaksi ${editingTxDate.transactionNumber} berhasil diperbarui!`);
      setTimeout(() => setEditSuccessMsg(null), 3500);
      setEditingTxDate(null);
    } catch (e) {
      console.error(e);
    }
  };

  const outlets = useMemo(() => getOutlets(), []);
  const bazaars = useMemo(() => getBazaarEvents(), []);

  // Map product IDs to category for fast lookup
  const productCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      map[p.id] = p.category;
    });
    return map;
  }, [products]);

  // Helper to determine item category
  const getItemCategory = (item: any): string => {
    if (item.category) return item.category;
    if (productCategoryMap[item.productId]) return productCategoryMap[item.productId];
    const nameLower = (item.productName || '').toLowerCase();
    const skuLower = (item.sku || '').toLowerCase();
    if (nameLower.includes('mukena') || skuLower.includes('mkn')) return 'Mukena';
    if (nameLower.includes('hijab') || nameLower.includes('pashmina') || nameLower.includes('voal') || skuLower.includes('hjb')) return 'Hijab';
    return 'Lainnya';
  };

  // Compute available years from transactions + current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentDate.getFullYear());
    yearsSet.add(currentDate.getFullYear() - 1);
    yearsSet.add(currentDate.getFullYear() + 1);
    transactions.forEach((tx) => {
      if (tx.date) {
        const y = new Date(tx.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentDate]);

  // Navigate months
  const handlePrevMonth = () => {
    setTimeframe('monthly');
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setTimeframe('monthly');
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Helper to compare dates cleanly
  const matchesDay = (isoString: string, targetDateStr: string) => {
    if (!isoString || !targetDateStr) return false;
    if (isoString.startsWith(targetDateStr)) return true;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return localDateStr === targetDateStr;
  };

  // Base Timeframe Filtered Transactions (before channel/category filters)
  const baseTimeframeTransactions = useMemo(() => {
    const now = new Date();
    const todayDate = toDateInputString(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonthlyPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    return transactions.filter((tx) => {
      if (!tx.date) return false;
      if (timeframe === 'today' && !matchesDay(tx.date, todayDate)) return false;
      if (timeframe === 'last7' && new Date(tx.date) < sevenDaysAgo) return false;
      if (timeframe === 'this_month') {
        const d = new Date(tx.date);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (prefix !== thisMonthPrefix) return false;
      }
      if (timeframe === 'monthly') {
        const d = new Date(tx.date);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (prefix !== selectedMonthlyPrefix) return false;
      }
      if (timeframe === 'custom_date' && !matchesDay(tx.date, filterCustomDate)) return false;
      return true;
    });
  }, [transactions, timeframe, selectedMonth, selectedYear, filterCustomDate]);

  // Filter transactions based on date, channel, specific outlet/bazaar, category, payment & search
  const filteredTransactions = useMemo(() => {
    return baseTimeframeTransactions.filter((tx) => {
      // Payment filter
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) {
        return false;
      }

      // Channel filter
      if (channelFilter !== 'all') {
        const type = tx.salesChannelType || 'toko';
        if (type !== channelFilter) {
          return false;
        }
      }

      // Specific Outlet filter (if Toko Offline is selected or in all channels)
      if (selectedOutletId !== 'all') {
        if (tx.outletId !== selectedOutletId) {
          return false;
        }
      }

      // Specific Bazaar filter (if Bazaar is selected)
      if (selectedBazaarName !== 'all') {
        if (!tx.bazaarName || !tx.bazaarName.toLowerCase().includes(selectedBazaarName.toLowerCase())) {
          return false;
        }
      }

      // Category filter (Hijab vs Mukena vs Lainnya)
      if (categoryFilter !== 'all') {
        const hasCategoryItem = tx.items.some((item) => {
          const cat = getItemCategory(item);
          return cat.toLowerCase() === categoryFilter.toLowerCase();
        });
        if (!hasCategoryItem) {
          return false;
        }
      }

      // Search query
      const query = searchTerm.toLowerCase();
      if (!query) return true;

      const matchSearch =
        tx.transactionNumber.toLowerCase().includes(query) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(query)) ||
        (tx.cashier && tx.cashier.toLowerCase().includes(query)) ||
        (tx.bazaarName && tx.bazaarName.toLowerCase().includes(query)) ||
        (tx.outletName && tx.outletName.toLowerCase().includes(query)) ||
        (tx.salesChannelName && tx.salesChannelName.toLowerCase().includes(query)) ||
        tx.items.some((i) => i.productName?.toLowerCase().includes(query) || i.sku?.toLowerCase().includes(query));

      return matchSearch;
    });
  }, [baseTimeframeTransactions, paymentFilter, channelFilter, selectedOutletId, selectedBazaarName, categoryFilter, searchTerm, productCategoryMap]);

  // Aggregate Metrics for Current Filtered List
  const totalOmset = filteredTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  
  const totalHpp = filteredTransactions.reduce((sum, tx) => {
    return sum + tx.items.reduce((iSum, item) => iSum + ((item.hpp || 0) * (item.quantity || 1)), 0);
  }, 0);

  const totalProfit = totalOmset - totalHpp;
  const profitMargin = totalOmset > 0 ? (totalProfit / totalOmset) * 100 : 0;
  
  const totalItemsSold = filteredTransactions.reduce((sum, tx) => {
    return sum + tx.items.reduce((iSum, item) => iSum + (item.quantity || 1), 0);
  }, 0);

  const avgBasketSize = filteredTransactions.length > 0 ? totalOmset / filteredTransactions.length : 0;

  // Global Channel Breakdown across the active timeframe (for comparison cards)
  const channelBreakdown = useMemo(() => {
    const map = {
      toko: { count: 0, total: 0, items: 0, label: 'Toko Offline' },
      bazaar: { count: 0, total: 0, items: 0, label: 'Bazaar & Event' },
      whatsapp: { count: 0, total: 0, items: 0, label: 'WhatsApp / Online' },
      custom: { count: 0, total: 0, items: 0, label: 'Saluran Lainnya' },
    };

    baseTimeframeTransactions.forEach((tx) => {
      const type = (tx.salesChannelType as keyof typeof map) || 'toko';
      if (map[type]) {
        map[type].count += 1;
        map[type].total += (tx.total || 0);
        map[type].items += tx.items.reduce((s, i) => s + (i.quantity || 1), 0);
      }
    });

    return map;
  }, [baseTimeframeTransactions]);

  // Global Category Breakdown across active timeframe (Hijab vs Mukena vs Others)
  const categoryBreakdown = useMemo(() => {
    let hijabOmset = 0;
    let hijabQty = 0;
    let hijabHpp = 0;
    let hijabTxCount = 0;

    let mukenaOmset = 0;
    let mukenaQty = 0;
    let mukenaHpp = 0;
    let mukenaTxCount = 0;

    let othersOmset = 0;
    let othersQty = 0;
    let othersHpp = 0;

    baseTimeframeTransactions.forEach((tx) => {
      let hasHijabInTx = false;
      let hasMukenaInTx = false;

      tx.items.forEach((item) => {
        const cat = getItemCategory(item);
        const subtotal = item.subtotal || ((item.price || 0) * (item.quantity || 1));
        const hppTotal = (item.hpp || 0) * (item.quantity || 1);
        const qty = item.quantity || 1;

        if (cat.toLowerCase() === 'hijab') {
          hijabOmset += subtotal;
          hijabQty += qty;
          hijabHpp += hppTotal;
          hasHijabInTx = true;
        } else if (cat.toLowerCase() === 'mukena') {
          mukenaOmset += subtotal;
          mukenaQty += qty;
          mukenaHpp += hppTotal;
          hasMukenaInTx = true;
        } else {
          othersOmset += subtotal;
          othersQty += qty;
          othersHpp += hppTotal;
        }
      });

      if (hasHijabInTx) hijabTxCount += 1;
      if (hasMukenaInTx) mukenaTxCount += 1;
    });

    const hijabProfit = hijabOmset - hijabHpp;
    const mukenaProfit = mukenaOmset - mukenaHpp;
    const othersProfit = othersOmset - othersHpp;

    return {
      hijab: {
        omset: hijabOmset,
        qty: hijabQty,
        profit: hijabProfit,
        margin: hijabOmset > 0 ? (hijabProfit / hijabOmset) * 100 : 0,
        txCount: hijabTxCount,
      },
      mukena: {
        omset: mukenaOmset,
        qty: mukenaQty,
        profit: mukenaProfit,
        margin: mukenaOmset > 0 ? (mukenaProfit / mukenaOmset) * 100 : 0,
        txCount: mukenaTxCount,
      },
      others: {
        omset: othersOmset,
        qty: othersQty,
        profit: othersProfit,
        margin: othersOmset > 0 ? (othersProfit / othersOmset) * 100 : 0,
      }
    };
  }, [baseTimeframeTransactions, productCategoryMap]);

  // Unique list of active bazaar names from transactions + stored bazaars
  const availableBazaarNames = useMemo(() => {
    const set = new Set<string>();
    bazaars.forEach(b => { if (b.name) set.add(b.name); });
    transactions.forEach(tx => { if (tx.bazaarName) set.add(tx.bazaarName); });
    return Array.from(set).filter(Boolean);
  }, [bazaars, transactions]);

  // Export Sales Report to CSV with Channel & Category insights
  const handleExportCSV = () => {
    const headers = [
      'No Transaksi',
      'Tanggal',
      'Saluran Penjualan',
      'Detail Outlet / Event',
      'Kategori Produk',
      'Item Hijab (pcs)',
      'Item Mukena (pcs)',
      'Rincian Produk',
      'Pelanggan',
      'No WA',
      'Kasir',
      'Metode Bayar',
      'Subtotal',
      'Diskon',
      'Total Akhir',
      'Estimasi Laba Kotor'
    ];

    const rows = filteredTransactions.map((tx) => {
      const txHpp = tx.items.reduce((s, i) => s + ((i.hpp || 0) * (i.quantity || 1)), 0);
      const txProfit = (tx.total || 0) - txHpp;
      
      let hijabCount = 0;
      let mukenaCount = 0;
      const categoriesFound: string[] = [];

      tx.items.forEach((item) => {
        const cat = getItemCategory(item);
        if (!categoriesFound.includes(cat)) categoriesFound.push(cat);
        if (cat.toLowerCase() === 'hijab') hijabCount += (item.quantity || 1);
        if (cat.toLowerCase() === 'mukena') mukenaCount += (item.quantity || 1);
      });

      const channelType = tx.salesChannelType || 'toko';
      const channelLabel = 
        channelType === 'toko' ? 'Toko Offline' :
        channelType === 'bazaar' ? 'Bazaar & Event' :
        channelType === 'whatsapp' ? 'WhatsApp' : 'Saluran Lainnya';

      const locationLabel = 
        channelType === 'toko' ? (tx.outletName || 'Toko Utama') :
        channelType === 'bazaar' ? (tx.bazaarName || 'Event Bazaar') :
        channelType === 'whatsapp' ? 'Online WA' : (tx.customChannelName || '-');

      const itemsDetail = tx.items.map(i => `${i.productName} (${i.quantity || 1} pcs)`).join('; ');

      return [
        tx.transactionNumber,
        tx.date,
        channelLabel,
        locationLabel,
        categoriesFound.join(', '),
        hijabCount,
        mukenaCount,
        itemsDetail,
        tx.customerName || 'Pelanggan Umum',
        tx.customerPhone || '-',
        tx.cashier || 'Admin',
        tx.paymentMethod,
        tx.subtotal,
        tx.discount || 0,
        tx.total,
        txProfit
      ];
    });

    let filename = `Laporan_Transaksi_${timeframe}`;
    if (timeframe === 'monthly') {
      filename = `Laporan_Transaksi_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}`;
    }
    if (channelFilter !== 'all') {
      filename += `_${channelFilter}`;
    }
    if (categoryFilter !== 'all') {
      filename += `_${categoryFilter}`;
    }

    exportToCSV(filename, headers, rows);
  };

  const getChannelBadge = (tx: SaleTransaction) => {
    const type = tx.salesChannelType || 'toko';
    if (type === 'bazaar') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-2xs">
          <Tent className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="truncate max-w-[140px]">{tx.bazaarName || 'Bazaar'}</span>
        </span>
      );
    }
    if (type === 'whatsapp') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-green-100/90 text-green-900 border border-green-300/80 shadow-2xs">
          <MessageCircle className="w-3.5 h-3.5 text-green-700 shrink-0" />
          <span>WhatsApp / Online</span>
        </span>
      );
    }
    if (type === 'custom') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-100/90 text-rose-900 border border-rose-300/80 shadow-2xs">
          <Tag className="w-3.5 h-3.5 text-[#9D6C72] shrink-0" />
          <span className="truncate max-w-[140px]">{tx.customChannelName || 'Kustom'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100/90 text-emerald-950 border border-emerald-300/80 shadow-2xs">
        <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="truncate max-w-[140px]">{tx.outletName || 'Toko Offline'}</span>
      </span>
    );
  };

  const isCurrentMonthSelected = 
    selectedMonth === (currentDate.getMonth() + 1) && 
    selectedYear === currentDate.getFullYear();

  // Calculate grand total omset of active timeframe
  const grandTimeframeOmset = baseTimeframeTransactions.reduce((s, tx) => s + (tx.total || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Laporan Penjualan & Transaksi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#9D6C72]/10 text-[#9D6C72] border border-[#9D6C72]/20">
              Multi-Channel & Kategori
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekap transaksi berdasarkan Toko Offline, Bazaar, WhatsApp, serta kategori produk Hijab dan Mukena.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe Filter */}
          <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'today' ? 'bg-[#9D6C72] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setTimeframe('last7')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'last7' ? 'bg-[#9D6C72] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => {
                setTimeframe('this_month');
                setSelectedMonth(currentDate.getMonth() + 1);
                setSelectedYear(currentDate.getFullYear());
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'this_month' ? 'bg-[#9D6C72] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'monthly' ? 'bg-[#9D6C72] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilih Bulan
            </button>
            <button
              onClick={() => setTimeframe('custom_date')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'custom_date' ? 'bg-[#9D6C72] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilih Tanggal
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'all' ? 'bg-[#9D6C72] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner for Date Edit */}
      {editSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{editSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Custom Specific Date Selection Bar */}
      {timeframe === 'custom_date' && (
        <div className="bg-gradient-to-r from-amber-50/80 via-white to-orange-50/60 p-4 rounded-3xl border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-600 text-white shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800">
                Filter Transaksi Berdasarkan Tanggal Spesifik
              </span>
              <div className="text-base font-black text-slate-800">
                {formatDateTime(`${filterCustomDate}T12:00:00.000Z`).split(',')[0]}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={filterCustomDate}
              onChange={(e) => setFilterCustomDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setFilterCustomDate(toDateInputString(new Date()))}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}

      {/* Month & Year Selection Bar (Active on 'monthly' and 'this_month') */}
      {(timeframe === 'monthly' || timeframe === 'this_month') && (
        <div className="bg-gradient-to-r from-rose-50/80 via-white to-pink-50/60 p-4 rounded-3xl border border-rose-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#9D6C72] text-white shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#9D6C72]">
                Periode Rekapitulasi Penjualan
              </span>
              <div className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <span>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
                {isCurrentMonthSelected && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    Bulan Berjalan
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Month & Year Selectors & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setTimeframe('monthly');
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9D6C72] shadow-2xs cursor-pointer"
            >
              {MONTH_NAMES.map((monthName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {monthName}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setTimeframe('monthly');
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9D6C72] shadow-2xs cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrentMonthSelected && (
              <button
                onClick={() => {
                  setSelectedMonth(currentDate.getMonth() + 1);
                  setSelectedYear(currentDate.getFullYear());
                  setTimeframe('this_month');
                }}
                className="px-2.5 py-2 text-[11px] font-bold text-[#9D6C72] bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-all shadow-2xs active:scale-95"
              >
                Ke Bulan Sekarang
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. FINANCIAL SUMMARY OVERVIEW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Omset */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Total Omset ({channelFilter === 'all' ? 'Semua Saluran' : channelFilter.toUpperCase()})
            </span>
            <div className="p-2 rounded-2xl bg-rose-50 text-[#9D6C72]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totalOmset)}
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span>Dari <strong>{filteredTransactions.length}</strong> transaksi</span>
            {categoryFilter !== 'all' && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                Filter {categoryFilter}
              </span>
            )}
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Estimasi Laba Kotor</span>
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {formatRupiah(totalProfit)}
          </div>
          <div className="text-xs text-emerald-800 font-semibold">
            Margin: <strong>{profitMargin.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Total Items Sold */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Produk Terjual</span>
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {totalItemsSold} <span className="text-sm font-bold text-slate-500">pcs</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Hijab, Mukena & Produk Lain
          </div>
        </div>

        {/* Rata-Rata Transaksi */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Rata-rata Keranjang (AOV)</span>
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(avgBasketSize)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Nilai rata-rata per transaksi
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. DAFTAR SALURAN (TOKO OFFLINE, BAZAAR, WHATSAPP) - INTERACTIVE CARDS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-50 text-[#9D6C72]">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                1. Performa Berdasarkan Saluran Penjualan
              </h2>
              <p className="text-[11px] text-slate-500">
                Klik kartu saluran untuk langsung menyaring daftar transaksi di bawah
              </p>
            </div>
          </div>

          {channelFilter !== 'all' && (
            <button
              onClick={() => {
                setChannelFilter('all');
                setSelectedOutletId('all');
                setSelectedBazaarName('all');
              }}
              className="text-xs font-bold text-[#9D6C72] hover:underline self-start sm:self-auto"
            >
              Tampilkan Semua Saluran
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Toko Offline Card */}
          <div 
            onClick={() => {
              setChannelFilter(channelFilter === 'toko' ? 'all' : 'toko');
              setSelectedBazaarName('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
              channelFilter === 'toko'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/80 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                Toko Offline
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                channelFilter === 'toko' ? 'bg-emerald-600 text-white' : 'bg-emerald-200/70 text-emerald-900'
              }`}>
                {channelBreakdown.toko.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-emerald-950 mt-2">
              {formatRupiah(channelBreakdown.toko.total)}
            </div>
            <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between mt-1">
              <span>{channelBreakdown.toko.items} pcs terjual</span>
              <span className="font-bold">
                {grandTimeframeOmset > 0 ? ((channelBreakdown.toko.total / grandTimeframeOmset) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Bazaar & Event Card */}
          <div 
            onClick={() => {
              setChannelFilter(channelFilter === 'bazaar' ? 'all' : 'bazaar');
              setSelectedOutletId('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
              channelFilter === 'bazaar'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-sm'
                : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/80 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Tent className="w-4 h-4 text-amber-600" />
                Bazaar & Event
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                channelFilter === 'bazaar' ? 'bg-amber-600 text-white' : 'bg-amber-200/70 text-amber-900'
              }`}>
                {channelBreakdown.bazaar.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-amber-950 mt-2">
              {formatRupiah(channelBreakdown.bazaar.total)}
            </div>
            <div className="text-[11px] text-amber-800 font-medium flex items-center justify-between mt-1">
              <span>{channelBreakdown.bazaar.items} pcs terjual</span>
              <span className="font-bold">
                {grandTimeframeOmset > 0 ? ((channelBreakdown.bazaar.total / grandTimeframeOmset) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* WhatsApp / Online Card */}
          <div 
            onClick={() => {
              setChannelFilter(channelFilter === 'whatsapp' ? 'all' : 'whatsapp');
              setSelectedOutletId('all');
              setSelectedBazaarName('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
              channelFilter === 'whatsapp'
                ? 'bg-green-50 border-green-500 ring-2 ring-green-500/30 shadow-sm'
                : 'bg-green-50/40 border-green-200 hover:bg-green-50/80 hover:border-green-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-green-950 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-green-600" />
                WhatsApp / Online
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                channelFilter === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-green-200/70 text-green-900'
              }`}>
                {channelBreakdown.whatsapp.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-green-950 mt-2">
              {formatRupiah(channelBreakdown.whatsapp.total)}
            </div>
            <div className="text-[11px] text-green-800 font-medium flex items-center justify-between mt-1">
              <span>{channelBreakdown.whatsapp.items} pcs terjual</span>
              <span className="font-bold">
                {grandTimeframeOmset > 0 ? ((channelBreakdown.whatsapp.total / grandTimeframeOmset) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Saluran Kustom / Lainnya */}
          <div 
            onClick={() => {
              setChannelFilter(channelFilter === 'custom' ? 'all' : 'custom');
              setSelectedOutletId('all');
              setSelectedBazaarName('all');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
              channelFilter === 'custom'
                ? 'bg-rose-50 border-[#9D6C72] ring-2 ring-[#9D6C72]/30 shadow-sm'
                : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/80 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#9D6C72]" />
                Saluran Lainnya
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                channelFilter === 'custom' ? 'bg-[#9D6C72] text-white' : 'bg-rose-200/70 text-rose-900'
              }`}>
                {channelBreakdown.custom.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-rose-950 mt-2">
              {formatRupiah(channelBreakdown.custom.total)}
            </div>
            <div className="text-[11px] text-rose-800 font-medium flex items-center justify-between mt-1">
              <span>{channelBreakdown.custom.items} pcs terjual</span>
              <span className="font-bold">
                {grandTimeframeOmset > 0 ? ((channelBreakdown.custom.total / grandTimeframeOmset) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KOMPARASI PER KATEGORI (HIJAB VS MUKENA) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                2. Performa Berdasarkan Kategori (Hijab vs Mukena)
              </h2>
              <p className="text-[11px] text-slate-500">
                Analisis omset, kuantitas terjual, dan laba kotor per kategori produk
              </p>
            </div>
          </div>

          {categoryFilter !== 'all' && (
            <button
              onClick={() => setCategoryFilter('all')}
              className="text-xs font-bold text-[#9D6C72] hover:underline self-start sm:self-auto"
            >
              Tampilkan Semua Kategori
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card Kategori Hijab */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Hijab' ? 'all' : 'Hijab')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden select-none ${
              categoryFilter === 'Hijab'
                ? 'bg-gradient-to-br from-pink-50 to-rose-50/80 border-[#9D6C72] ring-2 ring-[#9D6C72]/30 shadow-md'
                : 'bg-pink-50/30 border-pink-100 hover:bg-pink-50/60 hover:border-pink-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧕</span>
                <span className="font-black text-slate-800 text-sm">
                  Kategori HIJAB
                </span>
                {categoryFilter === 'Hijab' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#9D6C72] text-white rounded-full">
                    Filter Aktif
                  </span>
                )}
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 bg-white border border-rose-200 text-rose-900 rounded-xl shadow-2xs">
                {categoryBreakdown.hijab.qty} pcs terjual
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-100/80">
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Omset Hijab</span>
                <span className="text-base font-black text-slate-900">
                  {formatRupiah(categoryBreakdown.hijab.omset)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Laba Kotor</span>
                <span className="text-base font-black text-emerald-700">
                  {formatRupiah(categoryBreakdown.hijab.profit)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Margin Laba</span>
                <span className="text-base font-black text-[#9D6C72]">
                  {categoryBreakdown.hijab.margin.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-rose-100/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Terdapat pada <strong>{categoryBreakdown.hijab.txCount}</strong> transaksi</span>
              <span className="text-[#9D6C72] font-bold">Klik untuk filter transaksi Hijab →</span>
            </div>
          </div>

          {/* Card Kategori Mukena */}
          <div 
            onClick={() => setCategoryFilter(categoryFilter === 'Mukena' ? 'all' : 'Mukena')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden select-none ${
              categoryFilter === 'Mukena'
                ? 'bg-gradient-to-br from-teal-50 to-emerald-50/80 border-emerald-600 ring-2 ring-emerald-600/30 shadow-md'
                : 'bg-teal-50/30 border-teal-100 hover:bg-teal-50/60 hover:border-teal-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥻</span>
                <span className="font-black text-slate-800 text-sm">
                  Kategori MUKENA
                </span>
                {categoryFilter === 'Mukena' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-full">
                    Filter Aktif
                  </span>
                )}
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 bg-white border border-teal-200 text-teal-900 rounded-xl shadow-2xs">
                {categoryBreakdown.mukena.qty} pcs terjual
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-100/80">
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Omset Mukena</span>
                <span className="text-base font-black text-slate-900">
                  {formatRupiah(categoryBreakdown.mukena.omset)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Laba Kotor</span>
                <span className="text-base font-black text-emerald-700">
                  {formatRupiah(categoryBreakdown.mukena.profit)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Margin Laba</span>
                <span className="text-base font-black text-teal-700">
                  {categoryBreakdown.mukena.margin.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-teal-100/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Terdapat pada <strong>{categoryBreakdown.mukena.txCount}</strong> transaksi</span>
              <span className="text-emerald-700 font-bold">Klik untuk filter transaksi Mukena →</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TRANSACTIONS TABLE WITH DEDICATED CHANNEL & CATEGORY FILTERS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-0">
        
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#9D6C72]" />
              <h2 className="text-base font-black text-slate-800">
                Daftar Transaksi Penjualan ({filteredTransactions.length})
              </h2>
            </div>

            {/* Fast search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no. struk, pelanggan, bazaar, produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9D6C72]"
              />
            </div>
          </div>

          {/* Filter Bar 1: Saluran Penjualan (Toko Offline, Bazaar, WhatsApp) */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="font-bold text-slate-500 shrink-0 flex items-center gap-1">
              <Store className="w-3.5 h-3.5" />
              Saluran:
            </span>
            
            <button
              onClick={() => {
                setChannelFilter('all');
                setSelectedOutletId('all');
                setSelectedBazaarName('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                channelFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Saluran
            </button>

            <button
              onClick={() => {
                setChannelFilter('toko');
                setSelectedBazaarName('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                channelFilter === 'toko' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Toko Offline
            </button>

            <button
              onClick={() => {
                setChannelFilter('bazaar');
                setSelectedOutletId('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                channelFilter === 'bazaar' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Tent className="w-3.5 h-3.5" />
              Bazaar / Event
            </button>

            <button
              onClick={() => {
                setChannelFilter('whatsapp');
                setSelectedOutletId('all');
                setSelectedBazaarName('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                channelFilter === 'whatsapp' ? 'bg-green-600 text-white shadow-2xs' : 'bg-green-50 text-green-800 hover:bg-green-100'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>

            {/* Sub-filter if Toko Offline is chosen */}
            {channelFilter === 'toko' && outlets.length > 0 && (
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Semua Cabang Toko</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sub-filter if Bazaar is chosen */}
            {channelFilter === 'bazaar' && availableBazaarNames.length > 0 && (
              <select
                value={selectedBazaarName}
                onChange={(e) => setSelectedBazaarName(e.target.value)}
                className="px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">Semua Event Bazaar</option>
                {availableBazaarNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filter Bar 2: Kategori Produk (Hijab vs Mukena) & Payment Method */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs pt-1 border-t border-slate-100/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-500 shrink-0 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Kategori:
              </span>

              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  categoryFilter === 'all' ? 'bg-[#9D6C72] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Kategori
              </button>

              <button
                onClick={() => setCategoryFilter('Hijab')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  categoryFilter === 'Hijab' ? 'bg-pink-600 text-white shadow-2xs' : 'bg-pink-50 text-pink-800 hover:bg-pink-100'
                }`}
              >
                <span>🧕</span>
                <span>Hijab Only</span>
              </button>

              <button
                onClick={() => setCategoryFilter('Mukena')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  categoryFilter === 'Mukena' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-teal-50 text-teal-900 hover:bg-teal-100'
                }`}
              >
                <span>🥻</span>
                <span>Mukena Only</span>
              </button>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500">Metode Bayar:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">Semua Metode</option>
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
                <option value="debit">Debit</option>
              </select>
            </div>
          </div>

        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-9 h-9 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">Tidak ada transaksi yang cocok dengan filter aktif.</p>
              <p className="text-[11px] text-slate-400 mt-1">Coba ubah filter saluran, kategori produk, atau periode bulan di atas.</p>
              {(channelFilter !== 'all' || categoryFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setChannelFilter('all');
                    setCategoryFilter('all');
                    setPaymentFilter('all');
                    setSelectedOutletId('all');
                    setSelectedBazaarName('all');
                    setSearchTerm('');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 px-4">No. Transaksi & Waktu</th>
                  <th className="py-3.5 px-4">Saluran & Sumber</th>
                  <th className="py-3.5 px-4">Rincian Item per Kategori</th>
                  <th className="py-3.5 px-4">Pelanggan / Petugas</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const itemCount = tx.items.reduce((s, i) => s + (i.quantity || 1), 0);
                  
                  // Categorize items in this transaction
                  let hijabQtyInTx = 0;
                  let mukenaQtyInTx = 0;
                  let otherQtyInTx = 0;

                  tx.items.forEach((item) => {
                    const cat = getItemCategory(item);
                    const qty = item.quantity || 1;
                    if (cat.toLowerCase() === 'hijab') hijabQtyInTx += qty;
                    else if (cat.toLowerCase() === 'mukena') mukenaQtyInTx += qty;
                    else otherQtyInTx += qty;
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* No & Waktu */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono text-xs">
                          {tx.transactionNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDateTime(tx.date)}
                          </span>
                          {onUpdateTransaction && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditDate(tx)}
                              className="text-amber-700 hover:text-amber-900 text-[10px] font-bold inline-flex items-center gap-0.5 hover:underline"
                              title="Klik untuk atur tanggal & jam transaksi ini"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Ubah</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Saluran & Lokasi */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getChannelBadge(tx)}
                          {tx.stockDeductedLocationName && (
                            <span className="block text-[10px] text-slate-500">
                              Stok: {tx.stockDeductedLocationName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rincian Item dengan Badge Kategori Hijab / Mukena */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          
                          {/* Category Tag Breakdown */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hijabQtyInTx > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-pink-100 text-pink-900 border border-pink-200">
                                <span>🧕</span>
                                <span>Hijab ({hijabQtyInTx} pcs)</span>
                              </span>
                            )}
                            {mukenaQtyInTx > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200">
                                <span>🥻</span>
                                <span>Mukena ({mukenaQtyInTx} pcs)</span>
                              </span>
                            )}
                            {otherQtyInTx > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <span>Lainnya ({otherQtyInTx} pcs)</span>
                              </span>
                            )}
                          </div>

                          {/* Product Titles Snippet */}
                          <div 
                            className="text-[11px] text-slate-600 max-w-[260px] truncate" 
                            title={tx.items.map(i => `${i.productName} (${i.quantity || 1} pcs)`).join(', ')}
                          >
                            {tx.items.map(i => `${i.productName} (${i.quantity || 1})`).join(', ')}
                          </div>
                        </div>
                      </td>

                      {/* Pelanggan & Kasir */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {tx.customerName || 'Pelanggan Umum'}
                        </div>
                        {tx.customerPhone && (
                          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" />
                            {tx.customerPhone}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Petugas: {tx.cashier || 'Admin'}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                          {tx.paymentMethod}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-slate-900 text-sm">
                          {formatRupiah(tx.total)}
                        </div>
                        {tx.discount && tx.discount > 0 ? (
                          <div className="text-[10px] text-rose-600 font-semibold">
                            Diskon: -{formatRupiah(tx.discount)}
                          </div>
                        ) : null}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewReceipt(tx)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#9D6C72] hover:text-white text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors"
                            title="Lihat / Cetak Struk"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Struk</span>
                          </button>

                          {onUpdateTransaction && (
                            <button
                              onClick={() => handleOpenEditDate(tx)}
                              className="px-2 py-1.5 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 border border-amber-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all"
                              title="Atur / Ubah Tanggal Transaksi Ini"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Ubah Tgl</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Modal Atur/Ubah Tanggal Transaksi */}
      {editingTxDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Atur Tanggal Transaksi</h3>
                  <p className="text-xs text-slate-500">Ubah tanggal & waktu untuk transaksi ini</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTxDate(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Transaksi */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Transaksi:</span>
                <span className="font-mono font-bold text-slate-800">{editingTxDate.transactionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan:</span>
                <span className="font-bold text-slate-800">{editingTxDate.customerName || 'Pelanggan Umum'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Belanja:</span>
                <span className="font-black text-slate-900">{formatRupiah(editingTxDate.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Tercatat:</span>
                <span className="font-semibold text-slate-700">{formatDateTime(editingTxDate.date)}</span>
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Tanggal Baru:
                </label>
                <input
                  type="date"
                  value={editInputDate}
                  onChange={(e) => setEditInputDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Jam / Waktu Baru:
                </label>
                <input
                  type="time"
                  value={editInputTime}
                  onChange={(e) => setEditInputTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold">Pintasan:</span>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setEditInputDate(toDateInputString(now));
                    setEditInputTime(toTimeInputString(now));
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  ⚡ Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setEditInputDate(toDateInputString(d));
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  📅 Kemarin
                </button>
              </div>
            </div>

            {/* Preview of New Indonesian Date */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Preview Tanggal Baru:</span>
              <span className="font-bold">
                {(() => {
                  try {
                    const [y, m, d] = editInputDate.split('-').map(Number);
                    const [hh, mm] = (editInputTime || '12:00').split(':').map(Number);
                    const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
                    return formatDateTime(dt.toISOString());
                  } catch {
                    return '-';
                  }
                })()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTxDate(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDateChange}
                disabled={!editInputDate}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                Simpan Tanggal Baru
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
