import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar, 
  Download, 
  Receipt, 
  CreditCard, 
  QrCode, 
  Banknote, 
  User, 
  Search,
  Eye,
  ArrowUpRight,
  Store,
  Tent,
  MessageCircle,
  Tag,
  Building2,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { SaleTransaction, Product, SalesChannelType } from '../types';
import { formatRupiah, formatNumber, formatDateTime, exportToCSV } from '../utils/formatters';
import { getOutlets } from '../utils/outletStorage';

interface ReportsViewProps {
  transactions: SaleTransaction[];
  products: Product[];
  onViewReceipt: (transaction: SaleTransaction) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  onViewReceipt,
}) => {
  const currentDate = new Date();
  const [timeframe, setTimeframe] = useState<'today' | 'last7' | 'this_month' | 'monthly' | 'all'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [outletFilter, setOutletFilter] = useState<string>('all');

  const outlets = useMemo(() => getOutlets(), []);

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

  // Navigate to previous month
  const handlePrevMonth = () => {
    setTimeframe('monthly');
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setTimeframe('monthly');
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Filter transactions based on date, month/year, channel, payment, & search
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10);
    
    // Calculate last 7 days boundary
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
    const selectedMonthlyPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    return transactions.filter((tx) => {
      // Date filter
      if (timeframe === 'today' && !tx.date.startsWith(todayDate)) {
        return false;
      }
      if (timeframe === 'last7' && new Date(tx.date) < sevenDaysAgo) {
        return false;
      }
      if (timeframe === 'this_month' && !tx.date.startsWith(thisMonthPrefix)) {
        return false;
      }
      if (timeframe === 'monthly' && !tx.date.startsWith(selectedMonthlyPrefix)) {
        return false;
      }

      // Payment filter
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) {
        return false;
      }

      // Channel filter
      if (channelFilter !== 'all') {
        if (tx.salesChannelType !== channelFilter) {
          return false;
        }
      }

      // Outlet filter
      if (outletFilter !== 'all') {
        if (tx.outletId !== outletFilter) {
          return false;
        }
      }

      // Search query
      const query = searchTerm.toLowerCase();
      const matchSearch =
        tx.transactionNumber.toLowerCase().includes(query) ||
        tx.customerName.toLowerCase().includes(query) ||
        tx.cashier.toLowerCase().includes(query) ||
        (tx.bazaarName && tx.bazaarName.toLowerCase().includes(query)) ||
        (tx.outletName && tx.outletName.toLowerCase().includes(query)) ||
        (tx.salesChannelName && tx.salesChannelName.toLowerCase().includes(query)) ||
        tx.items.some((i) => i.productName.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query));

      return matchSearch;
    });
  }, [transactions, timeframe, selectedMonth, selectedYear, paymentFilter, channelFilter, outletFilter, searchTerm]);

  // Aggregate Metrics
  const totalOmset = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  
  const totalHpp = filteredTransactions.reduce((sum, tx) => {
    return sum + tx.items.reduce((iSum, item) => iSum + (item.hpp * item.quantity), 0);
  }, 0);

  const totalProfit = totalOmset - totalHpp;
  const profitMargin = totalOmset > 0 ? (totalProfit / totalOmset) * 100 : 0;
  
  const totalItemsSold = filteredTransactions.reduce((sum, tx) => {
    return sum + tx.items.reduce((iSum, item) => iSum + item.quantity, 0);
  }, 0);

  const avgBasketSize = filteredTransactions.length > 0 ? totalOmset / filteredTransactions.length : 0;

  // Channel Breakdown
  const channelBreakdown = useMemo(() => {
    const map = {
      toko: { count: 0, total: 0, label: 'Toko Offline' },
      bazaar: { count: 0, total: 0, label: 'Bazaar / Event' },
      whatsapp: { count: 0, total: 0, label: 'WhatsApp / Online' },
      custom: { count: 0, total: 0, label: 'Saluran Kustom' },
    };

    filteredTransactions.forEach((tx) => {
      const type = tx.salesChannelType || 'toko';
      if (map[type]) {
        map[type].count += 1;
        map[type].total += tx.total;
      }
    });

    return map;
  }, [filteredTransactions]);

  // Daily Breakdown inside Selected Month for Monthly Recap
  const dailyBreakdown = useMemo(() => {
    if (timeframe !== 'monthly' && timeframe !== 'this_month') return [];
    
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dayMap: Record<number, { day: number; count: number; total: number; profit: number; items: number }> = {};
    
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap[d] = { day: d, count: 0, total: 0, profit: 0, items: 0 };
    }

    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const day = txDate.getDate();
      if (dayMap[day]) {
        const txHpp = tx.items.reduce((s, i) => s + (i.hpp * i.quantity), 0);
        dayMap[day].count += 1;
        dayMap[day].total += tx.total;
        dayMap[day].profit += (tx.total - txHpp);
        dayMap[day].items += tx.items.reduce((s, i) => s + i.quantity, 0);
      }
    });

    return Object.values(dayMap).filter((d) => d.count > 0);
  }, [filteredTransactions, timeframe, selectedMonth, selectedYear]);

  // Top Selling Products in the selected period
  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; name: string; sku: string; category: string; qty: number; revenue: number }> = {};

    filteredTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            id: item.productId,
            name: item.productName,
            sku: item.sku,
            category: item.category,
            qty: 0,
            revenue: 0,
          };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.subtotal;
      });
    });

    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredTransactions]);

  // Export Sales Report to CSV
  const handleExportCSV = () => {
    const headers = [
      'No Transaksi',
      'Tanggal',
      'Saluran Penjualan',
      'Toko / Cabang',
      'Nama Bazaar / Event',
      'Pelanggan',
      'No WA',
      'Kasir',
      'Metode Bayar',
      'Jumlah Item',
      'Subtotal',
      'Diskon',
      'Total Akhir',
      'Estimasi Laba Kotor'
    ];

    const rows = filteredTransactions.map((tx) => {
      const txHpp = tx.items.reduce((s, i) => s + (i.hpp * i.quantity), 0);
      const txProfit = tx.total - txHpp;
      return [
        tx.transactionNumber,
        tx.date,
        tx.salesChannelName || (tx.salesChannelType === 'bazaar' ? 'Bazaar' : 'Toko Offline'),
        tx.outletName || '-',
        tx.bazaarName || '-',
        tx.customerName,
        tx.customerPhone || '-',
        tx.cashier,
        tx.paymentMethod,
        tx.items.reduce((s, i) => s + i.quantity, 0),
        tx.subtotal,
        tx.discount,
        tx.total,
        txProfit
      ];
    });

    let filename = `Laporan_Penjualan_AQMARINE_${timeframe}`;
    if (timeframe === 'monthly') {
      filename = `Laporan_Penjualan_AQMARINE_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}`;
    }

    exportToCSV(filename, headers, rows);
  };

  const getChannelBadge = (tx: SaleTransaction) => {
    const type = tx.salesChannelType || 'toko';
    if (type === 'bazaar') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
          <Tent className="w-3 h-3 text-amber-700" />
          {tx.bazaarName || 'Bazaar'}
        </span>
      );
    }
    if (type === 'whatsapp') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-900 border border-green-200">
          <MessageCircle className="w-3 h-3 text-green-700" />
          WhatsApp
        </span>
      );
    }
    if (type === 'custom') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
          <Tag className="w-3 h-3 text-[#9D6C72]" />
          {tx.customChannelName || 'Kustom'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
        <Store className="w-3 h-3 text-emerald-700" />
        {tx.outletName || 'Toko Offline'}
      </span>
    );
  };

  const isCurrentMonthSelected = 
    selectedMonth === (currentDate.getMonth() + 1) && 
    selectedYear === currentDate.getFullYear();

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Laporan Penjualan & Keuangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analisis omset, laba kotor, dan rekapitulasi penjualan bulanan per saluran.
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

      {/* Month & Year Selection Bar (Active on 'monthly' and 'this_month') */}
      {(timeframe === 'monthly' || timeframe === 'this_month') && (
        <div className="bg-gradient-to-r from-rose-50/80 via-white to-pink-50/60 p-4 rounded-3xl border border-rose-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#9D6C72] text-white shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#9D6C72]">
                Periode Rekapitulasi Bulanan
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

          {/* Month & Year Selectors & Fast Month Jump Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Prev Month */}
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Month Dropdown */}
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

            {/* Year Dropdown */}
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

            {/* Quick Next Month */}
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Reset to Today / Current Month if looking at other month */}
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

      {/* 4 Core Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Omset */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Omset Penjualan</span>
            <div className="p-2 rounded-2xl bg-rose-50 text-[#9D6C72]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totalOmset)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Dari <strong>{filteredTransactions.length}</strong> total transaksi
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Estimasi Laba Kotor (Gross)</span>
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
            Hijab & Mukena terdistribusi
          </div>
        </div>

        {/* Rata-Rata Transaksi */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Rata-rata Keranjang (AOV)</span>
            <div className="p-2 rounded-2xl bg-slate-50 text-slate-700">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(avgBasketSize)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Nilai transaksi rata-rata
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. SALES CHANNEL BREAKDOWN METRICS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-50 text-[#9D6C72]">
              <Tag className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              Performa Omset per Kategori Saluran Penjualan
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Toko Offline • Bazaar • WhatsApp • Kustom
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Toko Offline */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                Toko Offline
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-200/60 text-emerald-900 rounded-full">
                {channelBreakdown.toko.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-emerald-900">
              {formatRupiah(channelBreakdown.toko.total)}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              {totalOmset > 0 ? ((channelBreakdown.toko.total / totalOmset) * 100).toFixed(1) : 0}% dari total omset
            </div>
          </div>

          {/* Bazaar / Event */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Tent className="w-4 h-4 text-amber-600" />
                Bazaar / Event
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-full">
                {channelBreakdown.bazaar.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-amber-900">
              {formatRupiah(channelBreakdown.bazaar.total)}
            </div>
            <div className="text-[10px] text-amber-700 font-medium">
              {totalOmset > 0 ? ((channelBreakdown.bazaar.total / totalOmset) * 100).toFixed(1) : 0}% dari total omset
            </div>
          </div>

          {/* WhatsApp / Online */}
          <div className="p-4 rounded-2xl bg-green-50/50 border border-green-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-950 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-green-600" />
                WhatsApp / Online
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-green-200/60 text-green-900 rounded-full">
                {channelBreakdown.whatsapp.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-green-900">
              {formatRupiah(channelBreakdown.whatsapp.total)}
            </div>
            <div className="text-[10px] text-green-700 font-medium">
              {totalOmset > 0 ? ((channelBreakdown.whatsapp.total / totalOmset) * 100).toFixed(1) : 0}% dari total omset
            </div>
          </div>

          {/* Saluran Kustom */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#9D6C72]" />
                Saluran Kustom
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-200/60 text-rose-900 rounded-full">
                {channelBreakdown.custom.count} tx
              </span>
            </div>
            <div className="text-lg font-black text-rose-900">
              {formatRupiah(channelBreakdown.custom.total)}
            </div>
            <div className="text-[10px] text-rose-700 font-medium">
              {totalOmset > 0 ? ((channelBreakdown.custom.total / totalOmset) * 100).toFixed(1) : 0}% dari total omset
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5 MONTHLY DAILY BREAKDOWN & TOP PRODUCTS (For Monthly Recap) */}
      {/* ========================================================================= */}
      {(timeframe === 'monthly' || timeframe === 'this_month') && dailyBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Daily Breakdown Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Rincian Penjualan Harian ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {dailyBreakdown.length} hari aktif
              </span>
            </div>

            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3 text-center">Transaksi</th>
                    <th className="py-2 px-3 text-center">Item Terjual</th>
                    <th className="py-2 px-3 text-right">Omset</th>
                    <th className="py-2 px-3 text-right">Laba Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyBreakdown.map((item) => (
                    <tr key={item.day} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-800">
                        {item.day} {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 font-medium">
                        {item.count} tx
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700 font-bold">
                        {item.items} pcs
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">
                        {formatRupiah(item.total)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        {formatRupiah(item.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Produk Terlaris Bulan Ini
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Top 5
                </span>
              </div>

              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada data penjualan pada periode ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0 ? 'bg-amber-400 text-amber-950 shadow-2xs' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={p.name}>
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {p.category} • {p.sku}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-900">
                          {p.qty} <span className="text-[10px] text-slate-500 font-normal">pcs</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          {formatRupiah(p.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TRANSACTIONS TABLE WITH ADVANCED FILTERS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#9D6C72]" />
              <h2 className="text-base font-bold text-slate-800">
                Riwayat Transaksi Penjualan ({filteredTransactions.length})
              </h2>
            </div>

            {/* Fast search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no. struk, nama pembeli, bazaar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9D6C72]"
              />
            </div>
          </div>

          {/* Secondary Filters: Channel & Payment Method */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="font-semibold text-slate-500">Filter Saluran:</span>
            
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                channelFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Saluran
            </button>

            <button
              onClick={() => setChannelFilter('toko')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                channelFilter === 'toko' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Toko Offline
            </button>

            <button
              onClick={() => setChannelFilter('bazaar')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                channelFilter === 'bazaar' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Tent className="w-3.5 h-3.5" />
              Bazaar / Event
            </button>

            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                channelFilter === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-800 hover:bg-green-100'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>

            {/* Payment Filter */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Metode Bayar:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
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
              <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">Belum ada transaksi penjualan yang tercatat.</p>
              <p className="text-[11px]">Buka tab Input Penjualan untuk mulai mencatat transaksi baru.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">No. Transaksi / Waktu</th>
                  <th className="py-3 px-4">Saluran & Lokasi</th>
                  <th className="py-3 px-4">Pelanggan / Petugas</th>
                  <th className="py-3 px-4">Produk Item</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const itemCount = tx.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* No & Waktu */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          {tx.transactionNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDateTime(tx.date)}
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

                      {/* Pelanggan & Kasir */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {tx.customerName}
                        </div>
                        {tx.customerPhone && (
                          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" />
                            {tx.customerPhone}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {tx.cashier}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {itemCount} pcs
                        </div>
                        <div className="text-[11px] text-slate-500 max-w-[200px] truncate" title={tx.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}>
                          {tx.items.map(i => i.productName).join(', ')}
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
                        {tx.discount > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold">
                            Diskon: -{formatRupiah(tx.discount)}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewReceipt(tx)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          title="Lihat / Cetak Struk"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Struk</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};
