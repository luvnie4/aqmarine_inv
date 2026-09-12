import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Download, 
  Building2, 
  Store, 
  PlusCircle, 
  Calendar, 
  User, 
  DollarSign,
  PackageCheck,
  FileText,
  TrendingUp,
  Boxes,
  Trash2
} from 'lucide-react';
import { StockRestock, Product } from '../types';
import { formatRupiah, formatDateTime, exportToCSV } from '../utils/formatters';

interface RestocksViewProps {
  restocks: StockRestock[];
  products: Product[];
  onOpenRestockModal: () => void;
  onDeleteRestock?: (id: string) => void;
  onClearAllRestocks?: () => void;
}

export const RestocksView: React.FC<RestocksViewProps> = ({
  restocks,
  products,
  onOpenRestockModal,
  onDeleteRestock,
  onClearAllRestocks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  // Filter restocks
  const filteredRestocks = useMemo(() => {
    return restocks.filter((r) => {
      const query = searchTerm.toLowerCase();
      const matchSearch =
        r.productName.toLowerCase().includes(query) ||
        r.sku.toLowerCase().includes(query) ||
        (r.supplier && r.supplier.toLowerCase().includes(query)) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(query)) ||
        (r.operator && r.operator.toLowerCase().includes(query)) ||
        (r.locationName && r.locationName.toLowerCase().includes(query)) ||
        (r.notes && r.notes.toLowerCase().includes(query));

      const matchLocation = 
        selectedLocation === 'ALL' || 
        r.locationId === selectedLocation || 
        r.location === selectedLocation ||
        r.locationName === selectedLocation;

      return matchSearch && matchLocation;
    });
  }, [restocks, searchTerm, selectedLocation]);

  // Summary calculations
  const totalQty = useMemo(() => {
    return filteredRestocks.reduce((acc, r) => acc + (r.quantity || 0), 0);
  }, [filteredRestocks]);

  const totalCost = useMemo(() => {
    return filteredRestocks.reduce((acc, r) => {
      const cost = r.purchasePrice || r.unitCost || 0;
      return acc + (r.quantity * cost);
    }, 0);
  }, [filteredRestocks]);

  // Unique locations for filter
  const locations = useMemo(() => {
    const locSet = new Set<string>();
    restocks.forEach(r => {
      if (r.locationName) locSet.add(r.locationName);
      else if (r.location) locSet.add(r.location);
    });
    return Array.from(locSet);
  }, [restocks]);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Tanggal',
      'No Faktur / SJ',
      'SKU',
      'Nama Produk',
      'Lokasi Tujuan',
      'Jumlah Masuk (Pcs)',
      'HPP Beli (Rp)',
      'Total Nilai (Rp)',
      'Supplier / Konveksi',
      'Petugas',
      'Catatan'
    ];

    const rows = filteredRestocks.map((r) => [
      r.id,
      r.date,
      r.invoiceNumber || '-',
      r.sku,
      r.productName,
      r.locationName || r.location,
      r.quantity,
      r.purchasePrice || r.unitCost || 0,
      r.quantity * (r.purchasePrice || r.unitCost || 0),
      r.supplier || '-',
      r.operator || '-',
      r.notes || '-'
    ]);

    exportToCSV(`Riwayat_Restok_Barang_Masuk_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Restok & Barang Masuk
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {restocks.length} Transaksi
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Penerimaan pasokan barang dari konveksi/supplier untuk menambah stok toko & cabang.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {restocks.length > 0 && onClearAllRestocks && (
            <button
              onClick={onClearAllRestocks}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Hapus seluruh riwayat barang masuk / restok"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Riwayat Restok</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Export Excel/CSV</span>
          </button>

          <button
            onClick={onOpenRestockModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Catat Restok Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Barang Masuk
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              +{totalQty.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-500">pcs</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Nilai Pembelian (HPP)
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {formatRupiah(totalCost)}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Surat Jalan / Catatan Masuk
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {filteredRestocks.length} <span className="text-xs font-bold text-slate-500">dokumen</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari produk, SKU, supplier, invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">Lokasi:</span>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer w-full sm:w-auto"
          >
            <option value="ALL">Semua Lokasi Toko & Gudang</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Restocks Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Tanggal & Waktu</th>
                <th className="py-3.5 px-4">No. Faktur / SJ</th>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4">Lokasi Masuk</th>
                <th className="py-3.5 px-4 text-right">Jumlah Masuk</th>
                <th className="py-3.5 px-4 text-right">HPP Satuan</th>
                <th className="py-3.5 px-4 text-right">Total Nilai</th>
                <th className="py-3.5 px-4">Supplier / Konveksi</th>
                <th className="py-3.5 px-4">Petugas</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRestocks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-semibold">Belum ada riwayat barang masuk / restok</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Klik tombol "+ Catat Restok Baru" untuk menambahkan pasokan produk dari konveksi.
                    </p>
                    <button
                      onClick={onOpenRestockModal}
                      className="mt-3 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Input Restok Sekarang</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRestocks.map((item) => {
                  const unitCost = item.purchasePrice || item.unitCost || 0;
                  const total = item.quantity * unitCost;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {formatDateTime(item.date)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {item.invoiceNumber || item.restockNumber || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          <Store className="w-3 h-3 text-slate-500" />
                          {item.locationName || item.location || 'Toko Utama'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-blue-700 font-mono text-sm bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          +{item.quantity} pcs
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {formatRupiah(unitCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                        {formatRupiah(total)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {item.supplier || 'Konveksi Hijab Bandung'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {item.operator || 'Admin'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {onDeleteRestock && (
                          <button
                            onClick={() => onDeleteRestock(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                            title="Hapus riwayat barang masuk ini dan kurangi kembali stok barang"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
