import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Building2, 
  Store, 
  PlusCircle, 
  Download, 
  Calendar, 
  ArrowRight,
  User,
  FileText
} from 'lucide-react';
import { Product, StockTransfer, LocationType } from '../types';
import { formatDateTime, exportToCSV, generateTransferCode } from '../utils/formatters';

interface TransfersViewProps {
  products: Product[];
  transfers: StockTransfer[];
  onOpenTransferModal: () => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  products,
  transfers,
  onOpenTransferModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const query = searchTerm.toLowerCase();
      const matchSearch =
        t.productName.toLowerCase().includes(query) ||
        t.sku.toLowerCase().includes(query) ||
        t.transferNumber.toLowerCase().includes(query) ||
        t.operator.toLowerCase().includes(query) ||
        (t.fromLocationName && t.fromLocationName.toLowerCase().includes(query)) ||
        (t.toLocationName && t.toLocationName.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query));

      return matchSearch;
    });
  }, [transfers, searchTerm]);

  const totalQuantityTransferred = filteredTransfers.reduce((sum, t) => sum + t.quantity, 0);

  const handleExportCSV = () => {
    const headers = [
      'No Mutasi',
      'Tanggal',
      'SKU',
      'Nama Produk',
      'Dari Lokasi',
      'Ke Lokasi',
      'Jumlah (pcs)',
      'Petugas/Operator',
      'Catatan'
    ];

    const rows = filteredTransfers.map((t) => [
      t.transferNumber,
      t.date,
      t.sku,
      t.productName,
      t.fromLocationName || t.fromLocation,
      t.toLocationName || t.toLocation,
      t.quantity,
      t.operator,
      t.notes || '-'
    ]);

    exportToCSV(`Riwayat_Mutasi_Stok_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Mutasi & Transfer Antar Toko
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pindahkan stok barang antar toko, outlet cabang, atau event butik dengan pencatatan akurat.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Mutasi CSV
          </button>
          <button
            id="open-transfer-modal-btn"
            onClick={onOpenTransferModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm shadow-amber-200 active:scale-95 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            + Buat Mutasi Baru
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Total Transaksi Mutasi</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{filteredTransfers.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Total Barang Dipindahkan</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{totalQuantityTransferred} pcs</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari no mutasi, nama toko asal/tujuan, produk, SKU, petugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No. Mutasi & Waktu</th>
                <th className="py-3.5 px-4">Produk Hijab / Mukena</th>
                <th className="py-3.5 px-3 text-center">Arah Mutasi Toko</th>
                <th className="py-3.5 px-3 text-center">Jumlah</th>
                <th className="py-3.5 px-4">Petugas & Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">Tidak ada riwayat mutasi.</p>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {t.transferNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(t.date)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{t.productName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{t.sku}</div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                        <span className="text-amber-800">
                          {t.fromLocationName || t.fromLocation}
                        </span>
                        <ArrowRight className="w-3 h-3 text-rose-500" />
                        <span className="text-emerald-800">
                          {t.toLocationName || t.toLocation}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-black text-sm inline-block">
                        {t.quantity} pcs
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {t.operator}
                      </div>
                      {t.notes && (
                        <div className="text-[11px] text-slate-500 mt-0.5 italic">
                          "{t.notes}"
                        </div>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

