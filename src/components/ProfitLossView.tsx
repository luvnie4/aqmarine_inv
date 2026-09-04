import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Crown, 
  ShieldCheck, 
  PieChart as PieChartIcon, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  Printer, 
  Info, 
  Sparkles, 
  Package, 
  ArrowUpRight, 
  CheckCircle2, 
  HelpCircle,
  Layers,
  ChevronDown,
  Building2,
  Wallet,
  RotateCcw,
  Sliders,
  Settings
} from 'lucide-react';
import { SaleTransaction, Product, UserAccount } from '../types';
import { formatRupiah, formatNumber, exportToCSV } from '../utils/formatters';
import { 
  ProfitFormulaSettings, 
  getProfitFormulaSettings, 
  saveProfitFormulaSettings,
  DEFAULT_FORMULA_SETTINGS 
} from '../utils/profitFormulaStorage';
import { FormulaSettingsModal } from './FormulaSettingsModal';

interface ProfitLossViewProps {
  transactions: SaleTransaction[];
  products: Product[];
  currentUser: UserAccount | null;
}

export interface ItemProfitCalc {
  productId: string;
  sku: string;
  name: string;
  category: string;
  ruleType: 'hijab' | 'mukena' | 'other';
  quantitySold: number;
  revenue: number;      // Penjualan Aktual
  unitHpp: number;      // Rata-rata / HPP per pcs
  totalHpp: number;     // Total HPP
  labaKotor: number;    // Laba Kotor (Revenue - Total HPP)
  marginPercent: number; // Margin %
  // Bagi Hasil
  labaOwner: number;
  labaInvestor: number;
  operasional: number;
  kembaliKeModal: number;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  transactions,
  products,
  currentUser,
}) => {
  // Check Super Admin permissions
  const isSuperAdmin = 
    currentUser?.role === 'owner' || 
    currentUser?.role === 'superadmin' || 
    currentUser?.roleLabel?.toLowerCase().includes('super') ||
    currentUser?.username?.toLowerCase() === 'ceo_owner';

  // Month & Year state (Defaults to current month / bulan berjalan)
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isCurrentMonthOnly, setIsCurrentMonthOnly] = useState<boolean>(true);

  // Category Filter: 'all' | 'hijab' | 'mukena'
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'hijab' | 'mukena'>('all');
  
  // Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'profit_desc' | 'revenue_desc' | 'qty_desc' | 'name_asc'>('profit_desc');

  // Selected item for detailed calculation modal
  const [selectedDetailItem, setSelectedDetailItem] = useState<ItemProfitCalc | null>(null);

  // Show / Hide formula breakdown card
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(true);

  // Dynamic Formula Settings (bisa diatur persentasenya di halaman yang sama)
  const [formulaSettings, setFormulaSettings] = useState<ProfitFormulaSettings>(() => getProfitFormulaSettings());
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const handleUpdateFormulaSettings = (newSettings: ProfitFormulaSettings) => {
    setFormulaSettings(newSettings);
    saveProfitFormulaSettings(newSettings);
  };

  // Map of products for fast lookup of HPP and category
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      map.set(p.id, p);
      if (p.sku) map.set(p.sku, p);
    });
    return map;
  }, [products]);

  // Filter transactions according to selected month & year
  const targetMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      // Extract YYYY-MM
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return false;
      const prefix = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      return prefix === targetMonthPrefix;
    });
  }, [transactions, targetMonthPrefix]);

  // Aggregate items sold in this period
  const itemCalculations: ItemProfitCalc[] = useMemo(() => {
    const aggMap = new Map<string, {
      productId: string;
      sku: string;
      name: string;
      category: string;
      quantitySold: number;
      revenue: number;
      totalHpp: number;
    }>();

    periodTransactions.forEach((tx) => {
      if (!Array.isArray(tx.items)) return;

      tx.items.forEach((item: any) => {
        const pId = item.productId || item.id || `unknown-${item.productName || item.name}`;
        const pSku = item.sku || '';
        const pName = item.productName || item.name || 'Produk Tanpa Nama';
        const qty = Number(item.quantity || 1);
        const subtotal = Number(item.subtotal ?? (Number(item.price || 0) * qty));
        
        // Find product definition to get current HPP & Category if not in item
        const pDef = productMap.get(pId) || (pSku ? productMap.get(pSku) : undefined);
        const category = (item.category || pDef?.category || 'Hijab').trim();
        const itemHppUnit = Number(item.hpp ?? (pDef?.hpp ?? 0));
        const totalItemHpp = itemHppUnit * qty;

        const key = `${pId}__${pSku}__${pName}`;
        const existing = aggMap.get(key);

        if (existing) {
          existing.quantitySold += qty;
          existing.revenue += subtotal;
          existing.totalHpp += totalItemHpp;
        } else {
          aggMap.set(key, {
            productId: pId,
            sku: pSku || pDef?.sku || '-',
            name: pName,
            category,
            quantitySold: qty,
            revenue: subtotal,
            totalHpp: totalItemHpp,
          });
        }
      });
    });

    // Compute Profit & Loss & Profit Sharing per item
    const results: ItemProfitCalc[] = [];

    aggMap.forEach((val) => {
      const catLower = val.category.toLowerCase();
      const isHijab = catLower.includes('hijab') || catLower === 'pashmina' || catLower === 'segi empat' || catLower === 'bergo';
      const isMukena = catLower.includes('mukena');
      const ruleType: 'hijab' | 'mukena' | 'other' = isMukena ? 'mukena' : isHijab ? 'hijab' : 'other';

      const labaKotor = val.revenue - val.totalHpp;
      const marginPercent = val.revenue > 0 ? (labaKotor / val.revenue) * 100 : 0;
      const unitHpp = val.quantitySold > 0 ? Math.round(val.totalHpp / val.quantitySold) : 0;

      let labaOwner = 0;
      let labaInvestor = 0;
      let operasional = 0;
      let kembaliKeModal = 0;

      if (labaKotor > 0) {
        // Ambil konfigurasi persentase dinamis untuk kategori ini
        const cfg = formulaSettings[ruleType] || formulaSettings.other;

        // 1. Laba Investor (% dari Laba Kotor)
        labaInvestor = labaKotor * (cfg.investorPercent / 100);

        // 2. Sisa setelah Investor
        const sisa1 = Math.max(0, labaKotor - labaInvestor);

        // 3. Laba Owner (% dari sisa setelah investor)
        labaOwner = sisa1 * (cfg.ownerPercent / 100);

        // 4. Sisa setelah Owner
        const sisa2 = Math.max(0, sisa1 - labaOwner);

        // 5. Operasional Toko & Kembali ke Modal (% dari sisa akhir)
        operasional = sisa2 * (cfg.operasionalPercent / 100);
        kembaliKeModal = sisa2 * (cfg.kembaliModalPercent / 100);
      }

      results.push({
        productId: val.productId,
        sku: val.sku,
        name: val.name,
        category: val.category,
        ruleType,
        quantitySold: val.quantitySold,
        revenue: val.revenue,
        unitHpp,
        totalHpp: val.totalHpp,
        labaKotor,
        marginPercent,
        labaOwner: Math.round(labaOwner),
        labaInvestor: Math.round(labaInvestor),
        operasional: Math.round(operasional),
        kembaliKeModal: Math.round(kembaliKeModal),
      });
    });

    return results;
  }, [periodTransactions, productMap, formulaSettings]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return itemCalculations
      .filter((item) => {
        // Category Filter
        if (categoryFilter === 'hijab' && item.ruleType !== 'hijab') return false;
        if (categoryFilter === 'mukena' && item.ruleType !== 'mukena') return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchSku = item.sku.toLowerCase().includes(q);
          const matchCat = item.category.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'profit_desc') return b.labaKotor - a.labaKotor;
        if (sortBy === 'revenue_desc') return b.revenue - a.revenue;
        if (sortBy === 'qty_desc') return b.quantitySold - a.quantitySold;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [itemCalculations, categoryFilter, searchQuery, sortBy]);

  // Overall Financial Totals
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.totalQty += item.quantitySold;
        acc.totalRevenue += item.revenue;
        acc.totalHpp += item.totalHpp;
        acc.totalLabaKotor += item.labaKotor;
        acc.totalLabaOwner += item.labaOwner;
        acc.totalLabaInvestor += item.labaInvestor;
        acc.totalOperasional += item.operasional;
        acc.totalKembaliKeModal += item.kembaliKeModal;
        return acc;
      },
      {
        totalQty: 0,
        totalRevenue: 0,
        totalHpp: 0,
        totalLabaKotor: 0,
        totalLabaOwner: 0,
        totalLabaInvestor: 0,
        totalOperasional: 0,
        totalKembaliKeModal: 0,
      }
    );
  }, [filteredItems]);

  const overallMargin = totals.totalRevenue > 0 ? (totals.totalLabaKotor / totals.totalRevenue) * 100 : 0;

  // Export to CSV Handler
  const handleExportCSV = () => {
    const filename = `Laba_Rugi_AQMARINE_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}`;
    const headers = [
      'No',
      'Kode SKU',
      'Nama Produk',
      'Kategori',
      'Skema Bagi Hasil',
      'Qty Terjual (pcs)',
      'Penjualan Aktual (Rp)',
      'HPP Satuan (Rp)',
      'Total HPP (Rp)',
      'Laba Kotor (Rp)',
      'Margin (%)',
      'Laba Owner (Rp)',
      'Laba Investor (Rp)',
      'Alokasi Operasional (Rp)',
      'Kembali ke Modal (Rp)'
    ];

    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.sku,
      item.name,
      item.category,
      item.ruleType === 'hijab' ? 'Hijab (Owner 30%, Ops 35%, Modal 35%)' : item.ruleType === 'mukena' ? 'Mukena (Investor 30%, Owner 21%, Ops 24.5%, Modal 24.5%)' : 'Standar',
      item.quantitySold,
      item.revenue,
      item.unitHpp,
      item.totalHpp,
      item.labaKotor,
      item.marginPercent.toFixed(1) + '%',
      item.labaOwner,
      item.labaInvestor,
      item.operasional,
      item.kembaliKeModal
    ]);

    // Append Summary Row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      totals.totalQty,
      totals.totalRevenue,
      '',
      totals.totalHpp,
      totals.totalLabaKotor,
      overallMargin.toFixed(1) + '%',
      totals.totalLabaOwner,
      totals.totalLabaInvestor,
      totals.totalOperasional,
      totals.totalKembaliKeModal
    ]);

    exportToCSV(filename, headers, rows);
  };

  // If user is not superadmin, display security restriction screen
  if (!isSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Akses Terbatas: Khusus Super Admin & Pemilik</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Halaman <strong>Perhitungan Laba & Rugi (Bagi Hasil)</strong> memuat informasi finansial rahasia,
            persentase laba owner, investor, dan alokasi modal. Halaman ini hanya dapat diakses oleh akun Super Admin.
          </p>
          <div className="pt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              User saat ini: <strong>{currentUser?.name || 'Staff'}</strong> ({currentUser?.roleLabel || currentUser?.role || 'Guest'})
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MONTH SELECTOR BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-white via-rose-50/40 to-pink-50/50 p-6 rounded-3xl border border-[#9E6B70]/20 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Role Verification Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                <Crown className="w-3.5 h-3.5 text-amber-700" />
                <span>Khusus Super Admin & Owner</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#9E6B70]/15 text-[#8C5559]">
                <ShieldCheck className="w-3 h-3 text-[#9E6B70]" />
                <span>Bagi Hasil Otomatis</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calculator className="w-7 h-7 text-[#9E6B70]" />
              <span>Perhitungan Laba & Rugi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Perhitungan penjualan per item aktual di bulan berjalan, HPP modal pokok, Laba Kotor, serta pembagian laba Owner, Investor, Operasional, dan Kembali ke Modal.
            </p>
          </div>

          {/* Month / Year Control & Presets */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-white/90 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#9E6B70]" />
              <span className="text-xs font-bold text-slate-700">Periode:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Dropdown */}
              <select
                id="profit-loss-month-select"
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  setIsCurrentMonthOnly(m === currentMonth && selectedYear === currentYear);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                id="profit-loss-year-select"
                value={selectedYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setSelectedYear(y);
                  setIsCurrentMonthOnly(selectedMonth === currentMonth && y === currentYear);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Quick Button: Bulan Berjalan */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(currentMonth);
                  setSelectedYear(currentYear);
                  setIsCurrentMonthOnly(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isCurrentMonthOnly
                    ? 'bg-[#9E6B70] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ⚡ Bulan Berjalan
              </button>
            </div>
          </div>

        </div>

        {/* Status Period Badge */}
        <div className="mt-4 pt-3 border-t border-[#9E6B70]/15 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              📅 Periode Laporan: 
            </span>
            <span className="font-extrabold text-[#9E6B70] bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              {isCurrentMonthOnly && ' (Bulan Berjalan)'}
            </span>
            <span className="text-slate-500 font-medium">
              • {periodTransactions.length} transaksi penjualan tercatat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFormulaModalOpen(true)}
              className="px-3 py-1.5 bg-[#9E6B70] hover:bg-[#8C5559] text-white font-bold rounded-xl shadow-2xs inline-flex items-center gap-1.5 transition-all text-xs"
              title="Kustomisasi persentase bagi hasil Investor, Owner, Operasional, dan Modal"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Atur Rumus & Persentase</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
              className="text-[#8C5559] hover:underline font-bold inline-flex items-center gap-1 ml-1 text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showFormulaExplanation ? 'Sembunyikan Aturan' : 'Lihat Aturan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FORMULA EXPLANATION BANNER (DYNAMIC DISPLAY FROM FORMULA SETTINGS) */}
      {/* ========================================================================= */}
      {showFormulaExplanation && (() => {
        // Hitung persentase efektif terhadap laba kotor untuk display
        const calcEff = (cfg: typeof formulaSettings.hijab) => {
          const inv = cfg.investorPercent;
          const own = ((100 - inv) * cfg.ownerPercent) / 100;
          const rem = 100 - inv - own;
          const ops = (rem * cfg.operasionalPercent) / 100;
          const mod = (rem * cfg.kembaliModalPercent) / 100;
          return { inv, own, ops, mod };
        };
        const effHijab = calcEff(formulaSettings.hijab);
        const effMukena = calcEff(formulaSettings.mukena);

        return (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Ketentuan & Rumus Pembagian Laba Kotor</span>
                    <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Dapat Diedit di Halaman Ini
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Transparansi perhitungan alokasi keuntungan usaha butik AQMARINE</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormulaModalOpen(true)}
                  className="text-xs font-bold text-[#8C5559] hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 inline-flex items-center gap-1 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#9E6B70]" />
                  <span>Edit Nilai Rumus</span>
                </button>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  Formula Aktif
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Rule 1: HIJAB */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 to-pink-50/50 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌸</span>
                    <h4 className="text-sm font-black text-[#8C5559]">1. Skema Produk HIJAB</h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-[#9E6B70] border border-[#9E6B70]/30">
                    {formulaSettings.hijab.investorPercent > 0 ? `Inv ${effHijab.inv}% + ` : ''}Owner {effHijab.own.toFixed(1)}% + Ops {effHijab.ops.toFixed(1)}% + Modal {effHijab.mod.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {formulaSettings.hijab.investorPercent > 0 
                    ? `Laba Kotor dipotong ${formulaSettings.hijab.investorPercent}% Laba Investor, lalu sisa dipotong ${formulaSettings.hijab.ownerPercent}% Owner, sisa akhir dialokasikan untuk Operasional (${formulaSettings.hijab.operasionalPercent}%) dan Modal (${formulaSettings.hijab.kembaliModalPercent}%):`
                    : `Laba Kotor dipotong ${formulaSettings.hijab.ownerPercent}% Laba Owner, lalu sisa pengurangan dibagi ${formulaSettings.hijab.operasionalPercent}% Operasional dan ${formulaSettings.hijab.kembaliModalPercent}% Kembali ke Modal:`}
                </p>
                <div className={`grid ${formulaSettings.hijab.investorPercent > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center text-xs`}>
                  {formulaSettings.hijab.investorPercent > 0 && (
                    <div className="p-2 bg-white rounded-xl border border-purple-100 shadow-2xs">
                      <span className="text-[10px] text-purple-700 block font-bold">Investor</span>
                      <span className="text-sm font-black text-purple-900">{effHijab.inv}%</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">(Laba Kotor)</span>
                    </div>
                  )}
                  <div className="p-2 bg-white rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-bold">Laba Owner</span>
                    <span className="text-sm font-black text-[#9E6B70]">{effHijab.own.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">({formulaSettings.hijab.ownerPercent}% sisa)</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-bold">Operasional</span>
                    <span className="text-sm font-black text-blue-700">{effHijab.ops.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">({formulaSettings.hijab.operasionalPercent}% sisa)</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-rose-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-bold">Kembali Modal</span>
                    <span className="text-sm font-black text-emerald-700">{effHijab.mod.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">({formulaSettings.hijab.kembaliModalPercent}% sisa)</span>
                  </div>
                </div>
              </div>

              {/* Rule 2: MUKENA */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🥻</span>
                    <h4 className="text-sm font-black text-amber-900">2. Skema Produk MUKENA</h4>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-amber-900 border border-amber-300">
                    {formulaSettings.mukena.investorPercent > 0 ? `Investor ${effMukena.inv}% + ` : ''}Owner {effMukena.own.toFixed(1)}% + Ops {effMukena.ops.toFixed(1)}% + Modal {effMukena.mod.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {formulaSettings.mukena.investorPercent > 0
                    ? `Laba Kotor dibagi ${formulaSettings.mukena.investorPercent}% Laba Investor, lalu sisa dibagi ${formulaSettings.mukena.ownerPercent}% Laba Owner. Sisa akhir dibagi ${formulaSettings.mukena.operasionalPercent}% Operasional dan ${formulaSettings.mukena.kembaliModalPercent}% Kembali ke Modal:`
                    : `Laba Kotor dibagi ${formulaSettings.mukena.ownerPercent}% Laba Owner, lalu sisa dibagi ${formulaSettings.mukena.operasionalPercent}% Operasional dan ${formulaSettings.mukena.kembaliModalPercent}% Kembali ke Modal:`}
                </p>
                <div className={`grid ${formulaSettings.mukena.investorPercent > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 text-center text-xs`}>
                  {formulaSettings.mukena.investorPercent > 0 && (
                    <div className="p-2 bg-white rounded-xl border border-amber-100 shadow-2xs">
                      <span className="text-[10px] text-purple-700 block font-bold">Investor</span>
                      <span className="text-sm font-black text-purple-700">{effMukena.inv}%</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">(Laba Kotor)</span>
                    </div>
                  )}
                  <div className="p-2 bg-white rounded-xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-bold">Owner</span>
                    <span className="text-sm font-black text-[#9E6B70]">{effMukena.own.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">({formulaSettings.mukena.ownerPercent}% sisa 1)</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-bold">Operasional</span>
                    <span className="text-sm font-black text-blue-700">{effMukena.ops.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">({formulaSettings.mukena.operasionalPercent}% sisa 2)</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-bold">Modal</span>
                    <span className="text-sm font-black text-emerald-700">{effMukena.mod.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">({formulaSettings.mukena.kembaliModalPercent}% sisa 2)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. EXECUTIVE FINANCIAL KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Penjualan Aktual */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penjualan Aktual</span>
            <div className="p-2 rounded-xl bg-rose-50 text-[#9E6B70]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totals.totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total terjual: <strong>{formatNumber(totals.totalQty)} pcs</strong>
          </div>
        </div>

        {/* Total HPP (Modal Pokok) */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total HPP (Modal Pokok)</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totals.totalHpp)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Biaya pokok barang terjual
          </div>
        </div>

        {/* Total Laba Kotor */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Laba Kotor</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950 tracking-tight">
            {formatRupiah(totals.totalLabaKotor)}
          </div>
          <div className="text-xs text-emerald-800 font-bold">
            Margin: {overallMargin.toFixed(1)}% dari penjualan
          </div>
        </div>

        {/* Total Laba Owner */}
        <div className="bg-gradient-to-br from-rose-50 via-white to-pink-50/40 p-4 sm:p-5 rounded-3xl border border-[#9E6B70]/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C5559] uppercase tracking-wider">Hak Laba Owner</span>
            <div className="p-2 rounded-xl bg-[#9E6B70] text-white">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#8C5559] tracking-tight">
            {formatRupiah(totals.totalLabaOwner)}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Owner {formulaSettings.hijab.ownerPercent}% Hijab + {formulaSettings.mukena.ownerPercent}% Mukena
          </div>
        </div>

      </div>

      {/* Secondary KPI Cards: Investor, Operasional & Kembali ke Modal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Laba Investor */}
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-800 shrink-0">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-purple-800 block uppercase tracking-wider">
              Laba Investor (Mukena {formulaSettings.mukena.investorPercent}%{formulaSettings.hijab.investorPercent > 0 ? `, Hijab ${formulaSettings.hijab.investorPercent}%` : ''})
            </span>
            <span className="text-lg font-black text-slate-900 block">
              {formatRupiah(totals.totalLabaInvestor)}
            </span>
          </div>
        </div>

        {/* Operasional */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-100 text-blue-800 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-800 block uppercase tracking-wider">
              Alokasi Operasional Toko
            </span>
            <span className="text-lg font-black text-slate-900 block">
              {formatRupiah(totals.totalOperasional)}
            </span>
          </div>
        </div>

        {/* Kembali ke Modal */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">
              Alokasi Kembali ke Modal
            </span>
            <span className="text-lg font-black text-slate-900 block">
              {formatRupiah(totals.totalKembaliKeModal)}
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. FILTER CATEGORY, SEARCH & SORT BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Category Filter Pills (Per User Request: Filter berdasarkan Hijab dan Mukena) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Kategori:</span>
            </span>

            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua Kategori ({itemCalculations.length})
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('hijab')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'hijab'
                  ? 'bg-[#9E6B70] text-white shadow-2xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-[#8C5559] border border-rose-200'
              }`}
            >
              <span>🌸</span>
              <span>Hijab</span>
              <span className="text-[10px] opacity-80">
                ({itemCalculations.filter(i => i.ruleType === 'hijab').length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('mukena')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'mukena'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              <span>🥻</span>
              <span>Mukena</span>
              <span className="text-[10px] opacity-80">
                ({itemCalculations.filter(i => i.ruleType === 'mukena').length})
              </span>
            </button>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
              title="Download File CSV / Excel Laba Rugi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV / Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={filteredItems.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all"
              title="Cetak Laporan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>

        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama produk / SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="profit_desc">Laba Kotor Terbesar</option>
              <option value="revenue_desc">Penjualan (Omset) Tertinggi</option>
              <option value="qty_desc">Qty Terjual Terbanyak</option>
              <option value="name_asc">Nama Produk (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ITEM PROFIT & LOSS DETAIL TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#9E6B70]" />
            <h3 className="text-sm font-bold text-slate-900">
              Rincian Penjualan & Pembagian Laba per Item Produk
            </h3>
            <span className="text-xs text-slate-500">
              ({filteredItems.length} produk terjual di periode ini)
            </span>
          </div>

          <span className="text-xs font-bold text-slate-500">
            Bulan: <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Tidak Ada Transaksi Produk di Periode Ini</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Belum ada penjualan produk {categoryFilter !== 'all' ? `kategori ${categoryFilter}` : ''} pada bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}. 
              Silakan periksa input transaksi atau pilih bulan lainnya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-4 min-w-[200px]">Produk & Kategori</th>
                  <th className="py-3 px-3 text-center">Qty (pcs)</th>
                  <th className="py-3 px-3 text-right">Penjualan Aktual</th>
                  <th className="py-3 px-3 text-right">HPP Modal</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/70 text-emerald-950 font-black">Laba Kotor</th>
                  <th className="py-3 px-3 text-right text-[#8C5559] font-black">Laba Owner</th>
                  <th className="py-3 px-3 text-right text-purple-900 font-black">Laba Investor</th>
                  <th className="py-3 px-3 text-right text-blue-900 font-bold">Operasional</th>
                  <th className="py-3 px-3 text-right text-emerald-900 font-bold">Kembali Modal</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => {
                  const isHijab = item.ruleType === 'hijab';
                  const isMukena = item.ruleType === 'mukena';

                  return (
                    <tr 
                      key={`${item.productId}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Produk & Kategori */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            {item.sku}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isHijab 
                              ? 'bg-rose-50 text-[#8C5559] border border-rose-200' 
                              : isMukena 
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span>{isHijab ? '🌸' : isMukena ? '🥻' : '🏷️'}</span>
                            <span>{item.category}</span>
                          </span>
                        </div>
                      </td>

                      {/* Qty Terjual */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {formatNumber(item.quantitySold)}
                      </td>

                      {/* Penjualan Aktual */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(item.revenue)}
                      </td>

                      {/* Total HPP */}
                      <td className="py-3 px-3 text-right text-slate-600 font-medium">
                        <div>{formatRupiah(item.totalHpp)}</div>
                        <div className="text-[10px] text-slate-400">@{formatRupiah(item.unitHpp)}</div>
                      </td>

                      {/* Laba Kotor */}
                      <td className="py-3 px-3 text-right bg-emerald-50/50">
                        <div className="font-black text-emerald-900">
                          {formatRupiah(item.labaKotor)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          {item.marginPercent.toFixed(1)}%
                        </div>
                      </td>

                      {/* Laba Owner */}
                      <td className="py-3 px-3 text-right font-bold text-[#8C5559] bg-rose-50/30">
                        <div>{formatRupiah(item.labaOwner)}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.labaKotor > 0 ? `${((item.labaOwner / item.labaKotor) * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </td>

                      {/* Laba Investor */}
                      <td className="py-3 px-3 text-right">
                        {item.labaInvestor > 0 ? (
                          <div className="font-bold text-purple-800 bg-purple-50/50 py-0.5 px-1 rounded">
                            <div>{formatRupiah(item.labaInvestor)}</div>
                            <div className="text-[10px] text-purple-600">
                              {item.labaKotor > 0 ? `${((item.labaInvestor / item.labaKotor) * 100).toFixed(1)}%` : '0%'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Operasional */}
                      <td className="py-3 px-3 text-right text-blue-900 font-medium">
                        <div>{formatRupiah(item.operasional)}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.labaKotor > 0 ? `${((item.operasional / item.labaKotor) * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </td>

                      {/* Kembali ke Modal */}
                      <td className="py-3 px-3 text-right text-emerald-900 font-medium">
                        <div>{formatRupiah(item.kembaliKeModal)}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.labaKotor > 0 ? `${((item.kembaliKeModal / item.labaKotor) * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </td>

                      {/* Aksi Detail */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailItem(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-[#9E6B70] hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                          title="Lihat Rincian Perhitungan Item Ini"
                        >
                          <Info className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer - TOTALS */}
              <tfoot className="bg-slate-100/95 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-center uppercase tracking-wider text-xs font-black">
                    TOTAL KESELURUHAN ({filteredItems.length} ITEM)
                  </td>
                  <td className="py-3.5 px-3 text-center font-black">
                    {formatNumber(totals.totalQty)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black">
                    {formatRupiah(totals.totalRevenue)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-700 font-black">
                    {formatRupiah(totals.totalHpp)}
                  </td>
                  <td className="py-3.5 px-3 text-right bg-emerald-100/80 font-black text-emerald-950">
                    <div>{formatRupiah(totals.totalLabaKotor)}</div>
                    <div className="text-[10px] text-emerald-800">
                      {overallMargin.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-black text-[#8C5559] bg-rose-100/50">
                    {formatRupiah(totals.totalLabaOwner)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black text-purple-900 bg-purple-100/40">
                    {formatRupiah(totals.totalLabaInvestor)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black text-blue-900">
                    {formatRupiah(totals.totalOperasional)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black text-emerald-900">
                    {formatRupiah(totals.totalKembaliKeModal)}
                  </td>
                  <td className="py-3.5 px-3 text-center"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. DETAIL ITEM MODAL (STEP-BY-STEP CALCULATION AUDIT) */}
      {/* ========================================================================= */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-[#9E6B70]">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Rincian Perhitungan Laba Item</h3>
                  <p className="text-xs text-slate-500">Audit matematis alokasi bagi hasil</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Product Identity */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">SKU: {selectedDetailItem.sku}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                  selectedDetailItem.ruleType === 'hijab'
                    ? 'bg-rose-100 text-[#8C5559]'
                    : selectedDetailItem.ruleType === 'mukena'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  Kategori: {selectedDetailItem.category} ({selectedDetailItem.ruleType.toUpperCase()})
                </span>
              </div>
              <div className="text-base font-black text-slate-900">
                {selectedDetailItem.name}
              </div>
              <div className="text-xs text-slate-600 pt-1 flex justify-between">
                <span>Terjual: <strong>{selectedDetailItem.quantitySold} pcs</strong></span>
                <span>Periode: <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong></span>
              </div>
            </div>

            {/* Step-by-step Math Flow */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-100 font-semibold">
                <span>1. Penjualan Aktual (Omset):</span>
                <span className="font-bold text-slate-900">{formatRupiah(selectedDetailItem.revenue)}</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-100 font-semibold">
                <span>2. Total HPP ({selectedDetailItem.quantitySold} pcs × @{formatRupiah(selectedDetailItem.unitHpp)}):</span>
                <span className="font-bold text-slate-900">- {formatRupiah(selectedDetailItem.totalHpp)}</span>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 font-black text-emerald-950">
                <span>3. Laba Kotor (Penjualan - HPP):</span>
                <span className="text-sm">{formatRupiah(selectedDetailItem.labaKotor)}</span>
              </div>

              {/* Rule Breakdown */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Alokasi Sesuai Rumus Aktif ({selectedDetailItem.ruleType.toUpperCase()}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDetailItem(null);
                      setIsFormulaModalOpen(true);
                    }}
                    className="text-[11px] text-[#8C5559] hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Ubah Rumus</span>
                  </button>
                </div>

                {(() => {
                  const cfg = formulaSettings[selectedDetailItem.ruleType] || formulaSettings.other;
                  const invPct = cfg.investorPercent;
                  const ownPct = cfg.ownerPercent;
                  const opsPct = cfg.operasionalPercent;
                  const modPct = cfg.kembaliModalPercent;

                  return (
                    <div className="space-y-1.5 border border-slate-200 rounded-2xl p-3 bg-white">
                      {invPct > 0 && (
                        <div className="flex justify-between text-purple-900 font-bold py-1 border-b border-slate-100">
                          <span>• Laba Investor ({invPct}% Laba Kotor):</span>
                          <span>{formatRupiah(selectedDetailItem.labaInvestor)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-[#8C5559] font-bold py-1 border-b border-slate-100">
                        <span>
                          • Laba Owner ({ownPct}% {invPct > 0 ? 'dari Sisa 1' : 'Laba Kotor'}):
                        </span>
                        <span>{formatRupiah(selectedDetailItem.labaOwner)}</span>
                      </div>

                      <div className="flex justify-between text-blue-900 font-bold py-1 border-b border-slate-100">
                        <span>
                          • Alokasi Operasional ({opsPct}% dari Sisa Akhir):
                        </span>
                        <span>{formatRupiah(selectedDetailItem.operasional)}</span>
                      </div>

                      <div className="flex justify-between text-emerald-900 font-bold py-1">
                        <span>
                          • Kembali ke Modal ({modPct}% dari Sisa Akhir):
                        </span>
                        <span>{formatRupiah(selectedDetailItem.kembaliKeModal)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. FORMULA SETTINGS MODAL (PENGATURAN PERSENTASE BAGI HASIL) */}
      {/* ========================================================================= */}
      <FormulaSettingsModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        settings={formulaSettings}
        onSave={handleUpdateFormulaSettings}
      />

    </div>
  );
};
