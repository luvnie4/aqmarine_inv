import React from 'react';
import { 
  Building2, 
  Store, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeftRight, 
  PlusCircle, 
  Clock, 
  Sparkles,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { Product, SaleTransaction, StockTransfer, ActiveTab } from '../types';
import { formatRupiah, formatNumber, formatDateTime } from '../utils/formatters';

interface DashboardViewProps {
  products: Product[];
  transactions: SaleTransaction[];
  transfers: StockTransfer[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenTransferWithProduct?: (productId: string) => void;
  onOpenRestockWithProduct?: (productId: string) => void;
  onOpenAddProduct: () => void;
  onOpenTransfer: () => void;
  onOpenRestock: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  transactions,
  transfers,
  setActiveTab,
  onOpenTransferWithProduct,
  onOpenRestockWithProduct,
  onOpenAddProduct,
  onOpenTransfer,
  onOpenRestock,
}) => {
  // Total stats calculations
  const totalStockToko = products.reduce((sum, p) => sum + (p.stockToko || 0), 0);

  // Valuation calculations (based on HPP)
  const totalValuation = products.reduce((sum, p) => sum + ((p.stockToko || 0) * p.hpp), 0);

  // Estimated retail value (Potential Omset)
  const retailPotentialToko = products.reduce((sum, p) => sum + ((p.stockToko || 0) * p.priceRetail), 0);

  // Sales today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransactions = transactions.filter(t => t.date.startsWith(todayStr));
  
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const todayHpp = todayTransactions.reduce((sum, t) => {
    return sum + t.items.reduce((iSum, item) => iSum + (item.hpp * item.quantity), 0);
  }, 0);
  const todayProfit = todayRevenue - todayHpp;

  // Category breakdown
  const hijabProducts = products.filter(p => p.category === 'Hijab');
  const mukenaProducts = products.filter(p => p.category === 'Mukena');

  const hijabStock = hijabProducts.reduce((sum, p) => sum + (p.stockToko || 0), 0);
  const mukenaStock = mukenaProducts.reduce((sum, p) => sum + (p.stockToko || 0), 0);

  // Items needing attention (Low stock in Toko)
  const lowStockToko = products.filter(p => p.stockToko <= p.minStockAlert);
  const outOfStockToko = products.filter(p => p.stockToko === 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Quick Action Bar */}
      <div className="bg-gradient-to-r from-[#9D6C72] via-[#8C5B61] to-[#7B4D53] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative background circle */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-rose-100">
              <Sparkles className="w-3.5 h-3.5 text-[#E2C8C6]" />
              Sistem Manajemen Butik Muslimah
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ringkasan Inventori & Penjualan Butik
            </h2>
            <p className="text-rose-100/90 text-sm max-w-xl leading-relaxed">
              Pantau pergerakan stok hijab & mukena, omset kasir, dan status ketersediaan barang secara real-time.
            </p>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="dashboard-open-pos-btn"
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-2 px-5 py-3 bg-white text-[#8C5B61] hover:bg-rose-50 font-bold rounded-2xl shadow-md active:scale-95 transition-all text-sm"
            >
              <ShoppingBag className="w-4 h-4 text-[#8C5B61]" />
              Input Penjualan (Kasir)
            </button>
            <button
              id="dashboard-open-restock-btn"
              onClick={onOpenRestock}
              className="flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm font-semibold rounded-2xl active:scale-95 transition-all text-sm border border-white/20"
            >
              <PlusCircle className="w-4 h-4" />
              Catat Stok Masuk
            </button>
          </div>
        </div>
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Stok Toko */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stok Toko</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{formatNumber(totalStockToko)}</span>
              <span className="text-xs font-semibold text-slate-500">pcs siap jual</span>
            </div>
            <p className="text-xs text-slate-500">
              {products.length} model produk aktif
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
              Potensi Omset: {formatRupiah(retailPotentialToko)}
            </span>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="text-slate-600 hover:text-rose-600 font-semibold flex items-center gap-0.5"
            >
              Lihat <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 2: Penjualan Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Penjualan Hari Ini</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">
              {formatRupiah(todayRevenue)}
            </div>
            <p className="text-xs text-slate-500">
              {todayTransactions.length} transaksi tercatat hari ini
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Laba Kotor: <strong className="text-[#8C5B61]">{formatRupiah(todayProfit)}</strong></span>
            <button 
              onClick={() => setActiveTab('reports')}
              className="text-slate-600 hover:text-rose-600 font-semibold flex items-center gap-0.5"
            >
              Detail <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 3: Total Valuasi Aset Modal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Nilai Modal Stok</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-indigo-950">
              {formatRupiah(totalValuation)}
            </div>
            <p className="text-xs text-slate-500">
              Modal tertanam pada persediaan
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-md">
              HPP Terkalkulasi
            </span>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-0.5"
            >
              Katalog <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 4: Peringatan Stok Menipis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Peringatan Restock</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              lowStockToko.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-800 flex items-baseline gap-1.5">
              <span>{lowStockToko.length}</span>
              <span className="text-xs font-semibold text-slate-500">produk menipis</span>
            </div>
            <p className="text-xs text-slate-500">
              {outOfStockToko.length} produk stok kosong (0 pcs)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className={`font-medium px-2 py-0.5 rounded-md ${
              lowStockToko.length > 0 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
            }`}>
              {lowStockToko.length > 0 ? 'Perlu Restock Segera' : 'Stok Aman Terkendali'}
            </span>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="text-slate-600 hover:text-amber-700 font-semibold flex items-center gap-0.5"
            >
              Periksa <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Middle Section: Stock Alert & Category Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Low Stock Alerts with One-Click Restock */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Perhatian Stok Toko Menipis
                </h3>
                <p className="text-xs text-slate-500">
                  Produk di toko mendekati atau di bawah batas minimum ({lowStockToko.length} produk)
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Lihat Semua Stok
            </button>
          </div>

          {lowStockToko.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200 text-emerald-800">
              <p className="text-sm font-semibold">Semua stok produk toko dalam kondisi aman.</p>
              <p className="text-xs text-emerald-600 mt-1">Tidak ada produk yang berada di bawah batas minimum.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {lowStockToko.slice(0, 4).map((p) => {
                return (
                  <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">{p.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600">{p.sku}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Kategori: <strong className="text-slate-700">{p.category}</strong> • Batas Min: <strong>{p.minStockAlert} {p.unit}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs text-slate-500">Sisa Stok:</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            p.stockToko === 0 ? 'text-red-700 bg-red-100' : 'text-rose-600 bg-rose-50'
                          }`}>
                            {p.stockToko} {p.unit}
                          </span>
                        </div>
                      </div>

                      <button
                        id={`quick-restock-${p.id}`}
                        onClick={() => onOpenRestockWithProduct ? onOpenRestockWithProduct(p.id) : onOpenRestock()}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + Restock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Category Summary (Hijab vs Mukena) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">
                Komposisi Stok Produk
              </h3>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>

            {/* Hijab Card */}
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase">Kategori Hijab</span>
                <span className="text-xs font-black text-rose-900">{hijabProducts.length} Model</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-800">{hijabStock}</span>
                <span className="text-xs text-slate-500">Pashmina, Voal, Bergo, Khimar</span>
              </div>
              <div className="w-full bg-rose-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#9E6B70] h-full rounded-full" 
                  style={{ width: `${totalStockToko ? (hijabStock / totalStockToko) * 100 : 50}%` }}
                />
              </div>
            </div>

            {/* Mukena Card */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase">Kategori Mukena</span>
                <span className="text-xs font-black text-amber-900">{mukenaProducts.length} Model</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-800">{mukenaStock}</span>
                <span className="text-xs text-slate-500">Silk Sutra, Rayon Renda, Traveling</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-600 h-full rounded-full" 
                  style={{ width: `${totalStockToko ? (mukenaStock / totalStockToko) * 100 : 50}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              id="dashboard-new-product-btn"
              onClick={onOpenAddProduct}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-rose-400" />
              Tambah Produk Hijab / Mukena Baru
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Section: Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Stock Transfers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Riwayat Mutasi Antar Cabang
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('transfers')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Semua Mutasi
            </button>
          </div>

          {transfers.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada catatan mutasi stok.</p>
          ) : (
            <div className="space-y-3">
              {transfers.slice(0, 4).map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{t.productName}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{t.transferNumber}</span>
                      <span>•</span>
                      <span>{formatDateTime(t.date)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-800">
                      <span>{t.fromLocationName || t.fromLocation}</span>
                      <ArrowRight className="w-3 h-3 text-rose-600" />
                      <span>{t.toLocationName || t.toLocation}</span>
                    </div>
                    <div className="text-rose-600 font-extrabold text-xs mt-1">
                      {t.quantity} pcs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Penjualan Terakhir
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Semua Penjualan
            </button>
          </div>

          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi tercatat.</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{tx.customerName || 'Pelanggan'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full font-bold uppercase">
                        {tx.customerType}
                      </span>
                      {tx.outletName && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                          {tx.outletName}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{tx.transactionNumber}</span>
                      <span>•</span>
                      <span>{tx.items.length} item ({tx.items.reduce((s, i) => s + i.quantity, 0)} pcs)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">
                      {formatRupiah(tx.total)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                      {tx.paymentMethod}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};


