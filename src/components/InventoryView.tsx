import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Building2, 
  Store, 
  ArrowLeftRight, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Download, 
  Upload,
  ClipboardList, 
  Image as ImageIcon,
  Eye,
  MapPin,
  Layers
} from 'lucide-react';
import { Product, StoreOutlet } from '../types';
import { formatRupiah, formatNumber, exportToCSV } from '../utils/formatters';
import { ProductPhotoGalleryModal } from './ProductPhotoGalleryModal';
import { ImportProductsModal } from './ImportProductsModal';
import { getProductImages, getProductMainImage } from '../data/productPhotoPresets';
import { getOutlets } from '../utils/outletStorage';

interface InventoryViewProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onOpenTransferWithProduct: (productId: string) => void;
  onOpenOpnameWithProduct: (productId: string) => void;
  onOpenRestockWithProduct: (productId: string) => void;
  onImportProducts?: (importedProducts: Product[], replaceAll: boolean) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onOpenAddProduct,
  onOpenEditProduct,
  onDeleteProduct,
  onOpenTransferWithProduct,
  onOpenOpnameWithProduct,
  onOpenRestockWithProduct,
  onImportProducts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low_toko' | 'low_gudang' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'price_desc' | 'price_asc'>('name');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Outlets
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);

  useEffect(() => {
    setOutlets(getOutlets());
  }, []);

  // Helper to get stock for a specific outlet
  const getProductOutletStock = (product: Product, outletId: string): number => {
    if (product.outletStocks && product.outletStocks[outletId] !== undefined) {
      return product.outletStocks[outletId];
    }
    const outlet = outlets.find(o => o.id === outletId);
    if (outlet?.isDefault) return product.stockToko;
    return 0;
  };

  // Gallery modal state
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handleOpenGallery = (product: Product, index = 0) => {
    setGalleryProduct(product);
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  // Filter and Sort logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = searchTerm.toLowerCase().trim();
      if (query) {
        const matchSearch = 
          (product.name && product.name.toLowerCase().includes(query)) ||
          (product.sku && product.sku.toLowerCase().includes(query)) ||
          (product.barcode && product.barcode.toLowerCase().includes(query)) ||
          (product.notes && product.notes.toLowerCase().includes(query));

        if (!matchSearch) return false;
      }

      // Category match
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter === 'low_toko') {
        if (selectedLocationFilter !== 'all') {
          const s = getProductOutletStock(product, selectedLocationFilter);
          return s <= product.minStockAlert && s > 0;
        }
        return product.stockToko <= product.minStockAlert && product.stockToko > 0;
      }
      if (stockStatusFilter === 'out_of_stock') {
        if (selectedLocationFilter !== 'all') {
          return getProductOutletStock(product, selectedLocationFilter) === 0;
        }
        return product.stockToko === 0;
      }

      return true;
    }).sort((a, b) => {
      let stockA = a.stockToko;
      let stockB = b.stockToko;

      if (selectedLocationFilter !== 'all') {
        stockA = getProductOutletStock(a, selectedLocationFilter);
        stockB = getProductOutletStock(b, selectedLocationFilter);
      }

      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock_asc') return stockA - stockB;
      if (sortBy === 'stock_desc') return stockB - stockA;
      if (sortBy === 'price_desc') return b.priceRetail - a.priceRetail;
      if (sortBy === 'price_asc') return a.priceRetail - b.priceRetail;
      return 0;
    });
  }, [products, searchTerm, selectedCategory, selectedLocationFilter, stockStatusFilter, sortBy, outlets]);

  // Aggregate stats
  const totalStockToko = filteredProducts.reduce((sum, p) => sum + p.stockToko, 0);
  const totalValuation = filteredProducts.reduce((sum, p) => sum + (p.stockToko * p.hpp), 0);
  const lowStockCount = products.filter(p => p.stockToko <= p.minStockAlert && p.stockToko > 0).length;
  const outOfStockCount = products.filter(p => p.stockToko === 0).length;

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Nama Produk',
      'Kategori',
      'Stok Toko (pcs)',
      'Batas Min Alert',
      'HPP (Modal)',
      'Harga Jual Toko',
      'Harga Grosir/Reseller',
      'Total Nilai Aset (HPP)'
    ];

    const rows = filteredProducts.map((p) => [
      p.sku,
      p.barcode,
      p.name,
      p.category,
      p.stockToko,
      p.minStockAlert,
      p.hpp,
      p.priceRetail,
      p.priceGrosir,
      p.stockToko * p.hpp
    ]);

    exportToCSV(`Stok_Inventori_Toko_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Katalog & Stok Toko
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
              {products.length} Produk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola persediaan barang, harga jual, dan status ketersediaan stok di toko & cabang butik.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="import-inventory-csv-btn"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#8C5559] bg-rose-50 hover:bg-rose-100/80 border border-[#9E6B70]/20 rounded-xl transition-all"
            title="Upload data produk dari file CSV/Excel"
          >
            <Upload className="w-3.5 h-3.5 text-[#9E6B70]" />
            Import CSV
          </button>
          <button
            id="export-inventory-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Download file Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>
          <button
            id="add-product-main-btn"
            onClick={onOpenAddProduct}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#9E6B70] hover:bg-[#8C5559] rounded-xl shadow-sm shadow-[#9E6B70]/30 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            + Tambah Produk Baru
          </button>
        </div>
      </div>

      {/* Quick Summary Chips for filtered items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Stok Produk</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-emerald-950">{formatNumber(totalStockToko)}</span>
            <span className="text-xs text-emerald-700">pcs siap jual</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-600 uppercase block">Total Nilai Modal (HPP)</span>
          <div className="text-lg font-black text-slate-900 mt-0.5 truncate">
            {formatRupiah(totalValuation)}
          </div>
        </div>

        <div className="bg-rose-50/80 border border-rose-200/80 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-rose-800 uppercase block">Stok Menipis (Alert)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-rose-950">{lowStockCount}</span>
            <span className="text-xs text-rose-700">model produk</span>
          </div>
        </div>

        <div className="bg-red-50/80 border border-red-200/80 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-red-800 uppercase block">Stok Habis Total</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-red-950">{outOfStockCount}</span>
            <span className="text-xs text-red-700">model kosong</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="inventory-search-input"
              type="text"
              placeholder="Cari nama produk, SKU, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setSelectedCategory('Hijab')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'Hijab'
                  ? 'bg-[#9E6B70] text-white'
                  : 'bg-rose-50 text-[#9E6B70] hover:bg-rose-100'
              }`}
            >
              Hijab ({products.filter(p => p.category === 'Hijab').length})
            </button>
            <button
              onClick={() => setSelectedCategory('Mukena')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'Mukena'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Mukena ({products.filter(p => p.category === 'Mukena').length})
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                id="inventory-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="name">Urutkan: Nama (A-Z)</option>
                <option value="stock_asc">Stok Paling Sedikit</option>
                <option value="stock_desc">Stok Terbanyak</option>
                <option value="price_desc">Harga Termahal</option>
                <option value="price_asc">Harga Termurah</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabel
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kartu
              </button>
            </div>
          </div>
        </div>

        {/* Location Filter Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] font-bold shrink-0 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            Pilih Lokasi Toko:
          </span>

          <button
            onClick={() => setSelectedLocationFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
              selectedLocationFilter === 'all'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Toko ({outlets.length} Cabang)
          </button>

          {outlets.map((outlet) => {
            const isSelected = selectedLocationFilter === outlet.id;
            return (
              <button
                key={outlet.id}
                onClick={() => setSelectedLocationFilter(outlet.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Store className="w-3 h-3" />
                <span>{outlet.name}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-800 border border-emerald-300'
                }`}>
                  {outlet.code}
                </span>
                {outlet.isDefault && (
                  <span className="text-[9px] font-bold bg-amber-200/90 text-amber-900 px-1 py-0.2 rounded">
                    Utama
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-Filters / Status Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-medium shrink-0">Filter Status:</span>
          
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              stockStatusFilter === 'all' ? 'bg-slate-200 text-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Semua Status ({filteredProducts.length})
          </button>

          <button
            onClick={() => setStockStatusFilter('low_toko')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              stockStatusFilter === 'low_toko' ? 'bg-rose-100 text-rose-800 font-bold' : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            Stok Menipis (Alert: &le; Min) ({lowStockCount})
          </button>

          <button
            onClick={() => setStockStatusFilter('out_of_stock')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              stockStatusFilter === 'out_of_stock' ? 'bg-red-100 text-red-800 font-bold' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Stok Habis / Kosong ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Main Content: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Nama Produk</th>
                  <th className="py-3.5 px-3">Kategori</th>
                  <th className="py-3.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-800">
                      <Store className="w-3.5 h-3.5" /> Stok di Toko
                    </span>
                  </th>
                  <th className="py-3.5 px-3 text-center">Status Stok</th>
                  <th className="py-3.5 px-3 text-right">Harga Jual / Grosir</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <p className="font-semibold text-sm">Tidak ada produk yang cocok dengan pencarian.</p>
                      <p className="text-xs mt-1">Coba atur ulang kata kunci atau filter status.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const currentDisplayStock = selectedLocationFilter !== 'all'
                      ? getProductOutletStock(p, selectedLocationFilter)
                      : p.stockToko;
                    const isLow = currentDisplayStock <= p.minStockAlert && currentDisplayStock > 0;
                    const isOut = currentDisplayStock === 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Column 1: Photo & Product Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Product Photo Thumbnail */}
                            <div 
                              onClick={() => handleOpenGallery(p, 0)}
                              className="relative group/photo w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:ring-2 hover:ring-[#9E6B70] transition-all"
                              title="Klik untuk melihat foto produk"
                            >
                              <img
                                src={getProductMainImage(p)}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">{p.sku}</span>
                                {p.notes && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-[180px]">• {p.notes}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Category */}
                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.category === 'Hijab' ? 'bg-rose-50 text-[#9E6B70] border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {p.category}
                          </span>
                        </td>

                        {/* Column 3: Stock at Store */}
                        <td className="py-3.5 px-3 text-center">
                          {selectedLocationFilter !== 'all' ? (
                            // Specific outlet selected
                            (() => {
                              const outletStock = getProductOutletStock(p, selectedLocationFilter);
                              const currentOutlet = outlets.find(o => o.id === selectedLocationFilter);

                              return (
                                <div className="inline-flex flex-col items-center">
                                  <span className={`px-2.5 py-1 rounded-xl font-bold text-xs ${
                                    outletStock === 0
                                      ? 'bg-red-100 text-red-900 border border-red-300'
                                      : outletStock <= p.minStockAlert
                                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                  }`}>
                                    {outletStock} {p.unit}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                    di {currentOutlet?.name || 'Toko'}
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            // All outlets view
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-3 py-1 rounded-xl font-bold text-xs ${
                                p.stockToko === 0
                                  ? 'bg-red-100 text-red-900 border border-red-300'
                                  : isLow 
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300' 
                                  : 'bg-emerald-50 text-emerald-900'
                              }`}>
                                {p.stockToko} {p.unit}
                              </span>

                              {/* Per-outlet breakdown badges if multiple outlets */}
                              {outlets.length > 1 && (
                                <div className="flex flex-wrap items-center justify-center gap-1 max-w-[220px] mt-0.5">
                                  {outlets.map((o) => {
                                    const s = getProductOutletStock(p, o.id);
                                    return (
                                      <span 
                                        key={o.id}
                                        title={`${o.name}: ${s} ${p.unit}`}
                                        className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold"
                                      >
                                        {o.code}: <span className={s === 0 ? 'text-red-600' : 'text-emerald-700'}>{s}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Column 4: Stock Status & Valuation */}
                        <td className="py-3.5 px-3 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Habis Total
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Menipis (Min: {p.minStockAlert})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Stok Aman
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">
                            Aset: {formatRupiah(p.stockToko * p.hpp)}
                          </div>
                        </td>

                        {/* Column 5: Prices */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-black text-slate-900 text-sm">
                            {formatRupiah(p.priceRetail)}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Grosir: <span className="font-medium text-slate-700">{formatRupiah(p.priceGrosir)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Modal: {formatRupiah(p.hpp)}
                          </div>
                        </td>

                        {/* Column 6: Action Buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Transfer button (if multiple outlets exist) */}
                            {outlets.length > 1 && (
                              <button
                                id={`transfer-action-${p.id}`}
                                onClick={() => onOpenTransferWithProduct(p.id)}
                                title="Mutasi Stok Antar Cabang Toko"
                                className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 hover:border hover:border-amber-200 transition-colors"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>
                            )}

                            {/* Restock button */}
                            <button
                              id={`restock-action-${p.id}`}
                              onClick={() => onOpenRestockWithProduct(p.id)}
                              title="Tambah Stok Masuk Toko"
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 hover:border hover:border-emerald-200 transition-colors"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>

                            {/* Stock Opname button */}
                            <button
                              id={`opname-action-${p.id}`}
                              onClick={() => onOpenOpnameWithProduct(p.id)}
                              title="Stok Opname / Penyesuaian Fisik"
                              className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 hover:border hover:border-indigo-200 transition-colors"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>

                            {/* Edit button */}
                            <button
                              id={`edit-action-${p.id}`}
                              onClick={() => onOpenEditProduct(p)}
                              title="Edit Data Produk"
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete button */}
                            {deletingProductId === p.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteProduct(p.id);
                                    setDeletingProductId(null);
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-xs"
                                >
                                  Ya, Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingProductId(null)}
                                  className="px-1.5 py-0.5 bg-white text-slate-600 hover:bg-slate-100 rounded text-[10px] font-semibold"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                id={`delete-action-${p.id}`}
                                onClick={() => setDeletingProductId(p.id)}
                                title="Hapus Produk"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const currentStock = selectedLocationFilter !== 'all' 
              ? getProductOutletStock(p, selectedLocationFilter)
              : p.stockToko;
            const isLow = currentStock <= p.minStockAlert && currentStock > 0;
            const isOut = currentStock === 0;
            const images = getProductImages(p);

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Photo Header with Gallery Click */}
                  <div 
                    onClick={() => handleOpenGallery(p, 0)}
                    className="relative aspect-16/9 w-full bg-slate-900 cursor-pointer group overflow-hidden"
                  >
                    <img
                      src={getProductMainImage(p)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />
                    
                    {/* Top tags */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full shadow-xs backdrop-blur-xs ${
                        p.category === 'Hijab' ? 'bg-[#9E6B70]/90 text-white' : 'bg-amber-600/90 text-white'
                      }`}>
                        {p.category}
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                        {p.sku}
                      </span>
                    </div>

                    {/* Bottom Photo Count */}
                    <div className="absolute bottom-2 right-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>{images.length} Foto</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-snug">{p.name}</h3>
                      {p.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                          {p.notes}
                        </p>
                      )}
                    </div>

                    {/* Stock Display */}
                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          {selectedLocationFilter !== 'all'
                            ? `Stok di ${outlets.find(o => o.id === selectedLocationFilter)?.name || 'Toko'}:`
                            : 'Total Stok Toko:'}
                        </span>
                        <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                          isOut
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : isLow
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {currentStock} {p.unit}
                        </span>
                      </div>

                      {/* Outlet pills when viewing all stores and multiple outlets exist */}
                      {selectedLocationFilter === 'all' && outlets.length > 1 && (
                        <div className="flex flex-wrap items-center justify-start gap-1 pt-1.5 border-t border-slate-200/60">
                          {outlets.map((o) => {
                            const s = getProductOutletStock(p, o.id);
                            return (
                              <span 
                                key={o.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono font-medium"
                              >
                                {o.code}: <span className={s === 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>{s}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-1">
                      <span className="text-slate-500">Harga Jual:</span>
                      <span className="text-base font-black text-slate-900">{formatRupiah(p.priceRetail)}</span>
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  {outlets.length > 1 && (
                    <button
                      onClick={() => onOpenTransferWithProduct(p.id)}
                      className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Mutasi
                    </button>
                  )}
                  <button
                    onClick={() => onOpenRestockWithProduct(p.id)}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Restock
                  </button>
                  <button
                    onClick={() => onOpenEditProduct(p)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200/70 rounded-xl"
                    title="Edit Produk"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Photo Gallery Modal */}
      <ProductPhotoGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        product={galleryProduct}
        initialPhotoIndex={galleryIndex}
      />

      {/* Import Products Modal */}
      {onImportProducts && (
        <ImportProductsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={onImportProducts}
          existingCount={products.length}
        />
      )}
    </div>
  );
};
