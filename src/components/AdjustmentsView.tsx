import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  Download, 
  Building2, 
  Store, 
  PlusCircle, 
  Calendar, 
  User, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { StockAdjustment, LocationType, Product } from '../types';
import { formatDateTime, exportToCSV } from '../utils/formatters';

interface AdjustmentsViewProps {
  adjustments: StockAdjustment[];
  products: Product[];
  onOpenOpnameModal: () => void;
}

export const AdjustmentsView: React.FC<AdjustmentsViewProps> = ({
  adjustments,
  products,
  onOpenOpnameModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      const query = searchTerm.toLowerCase();
      const matchSearch =
        a.productName.toLowerCase().includes(query) ||
        a.sku.toLowerCase().includes(query) ||
        a.operator.toLowerCase().includes(query) ||
        a.reason.toLowerCase().includes(query) ||
        (a.locationName && a.locationName.toLowerCase().includes(query)) ||
        (a.notes && a.notes.toLowerCase().includes(query));

      return matchSearch;
    });
  }, [adjustments, searchTerm]);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Tanggal',
      'SKU',
      'Nama Produk',
      'Lokasi Toko',
      'Stok Sebelum',
      'Stok Fisik Baru',
      'Selisih (pcs)',
      'Alasan',
      'Petugas',
      'Catatan'
    ];

    const rows = filteredAdjustments.map((a) => [
      a.id,
      a.date,
      a.sku,
      a.productName,
      a.locationName || a.location,
      a.previousStock,
      a.newStock,
      a.difference,
      a.reason,
      a.operator,
      a.notes || '-'
    ]);

    exportToCSV(`Riwayat_Stok_Opname_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'rusak': return 'Cacat / Rusak';
      case 'hilang': return 'Hilang';
      case 'koreksi_fisik': return 'Koreksi Hitung';
      case 'sample_display': return 'Sample Display';
      case 'retur': return 'Retur Pelanggan';
      default: return reason;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-800">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Stok Opname & Penyesuaian Fisik
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Riwayat koreksi dan audit fisik stok barang per toko / butik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Opname CSV
          </button>
          <button
            id="open-opname-modal-btn"
            onClick={onOpenOpnameModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            + Input Opname Baru
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari produk, SKU, nama toko, petugas, alasan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Waktu Audit</th>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-3">Toko / Lokasi</th>
                <th className="py-3.5 px-3 text-center">Stok Awal ➔ Fisik</th>
                <th className="py-3.5 px-3 text-center">Selisih</th>
                <th className="py-3.5 px-3">Alasan</th>
                <th className="py-3.5 px-4">Petugas & Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">Belum ada catatan stok opname.</p>
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateTime(a.date)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{a.productName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{a.sku}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800">
                        <Store className="w-3.5 h-3.5" />
                        {a.locationName || a.location}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="font-mono text-xs font-semibold text-slate-700">
                        {a.previousStock} ➔ <strong className="text-slate-900">{a.newStock} pcs</strong>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        a.difference === 0 
                          ? 'bg-slate-100 text-slate-700' 
                          : a.difference > 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {a.difference > 0 ? `+${a.difference}` : a.difference} pcs
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                        {getReasonLabel(a.reason)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {a.operator}
                      </div>
                      {a.notes && (
                        <div className="text-[11px] text-slate-500 mt-0.5 italic">
                          "{a.notes}"
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
