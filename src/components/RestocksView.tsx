import React, { useMemo, useState } from 'react';
import { Calendar, Download, Edit2, FileText, PackagePlus, Search, Store, Trash2, Truck, User } from 'lucide-react';
import type { StockRestock } from '../types';
import { exportToCSV, formatDateTime, formatRupiah } from '../utils/formatters';

interface Props {
  restocks: StockRestock[];
  onOpenRestockModal: () => void;
  onEdit: (record: StockRestock) => void;
  onDelete: (record: StockRestock) => void;
}

export function RestocksView({ restocks, onOpenRestockModal, onEdit, onDelete }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredRestocks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return restocks;
    return restocks.filter((item) => [
      item.restockNumber,
      item.invoiceNumber,
      item.productName,
      item.sku,
      item.supplier,
      item.locationName,
      item.operator,
      item.notes,
    ].some(value => String(value || '').toLowerCase().includes(query)));
  }, [restocks, searchTerm]);

  const totalUnits = filteredRestocks.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPurchase = filteredRestocks.reduce((sum, item) => {
    const unitCost = Number(item.purchasePrice ?? item.unitCost ?? 0);
    return sum + unitCost * Number(item.quantity || 0);
  }, 0);

  const handleExport = () => {
    const headers = ['No Barang Masuk', 'Tanggal', 'Surat Jalan / Faktur', 'SKU', 'Produk', 'Jumlah', 'HPP Satuan', 'Nilai Pembelian', 'Supplier', 'Lokasi', 'Petugas', 'Catatan'];
    const rows = filteredRestocks.map((item) => {
      const unitCost = Number(item.purchasePrice ?? item.unitCost ?? 0);
      return [
        item.restockNumber || item.id,
        item.date,
        item.invoiceNumber || '-',
        item.sku,
        item.productName,
        item.quantity,
        unitCost,
        unitCost * Number(item.quantity || 0),
        item.supplier || '-',
        item.locationName || item.location,
        item.operator || '-',
        item.notes || '-',
      ];
    });
    exportToCSV(`Riwayat_Barang_Masuk_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><Truck className="w-5 h-5" /></div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Restock & Barang Masuk</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Catat penerimaan dari supplier dan pantau seluruh riwayat penambahan stok.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleExport} disabled={!filteredRestocks.length} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button id="open-restock-page-modal-btn" onClick={onOpenRestockModal} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-200 active:scale-95 transition-all">
            <PackagePlus className="w-4 h-4" /> + Barang Masuk Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Summary label="Catatan Barang Masuk" value={String(filteredRestocks.length)} icon={<FileText className="w-5 h-5" />} />
        <Summary label="Total Unit Diterima" value={`${totalUnits.toLocaleString('id-ID')} pcs`} icon={<PackagePlus className="w-5 h-5" />} accent="emerald" />
        <Summary label="Nilai Pembelian" value={formatRupiah(totalPurchase)} icon={<Truck className="w-5 h-5" />} accent="rose" />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Cari produk, SKU, supplier, faktur, lokasi, atau petugas..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
              <tr><th className="py-3.5 px-4">Waktu & Faktur</th><th className="py-3.5 px-4">Produk</th><th className="py-3.5 px-3">Supplier</th><th className="py-3.5 px-3">Lokasi</th><th className="py-3.5 px-3 text-center">Jumlah</th><th className="py-3.5 px-3 text-right">HPP & Nilai</th><th className="py-3.5 px-4">Petugas</th><th className="py-3.5 px-4 text-center">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filteredRestocks.length ? <tr><td colSpan={8} className="py-12 text-center text-slate-400"><p className="font-semibold text-sm">Belum ada catatan barang masuk.</p></td></tr> : filteredRestocks.map((item) => {
                const unitCost = Number(item.purchasePrice ?? item.unitCost ?? 0);
                return <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4"><div className="font-mono font-bold text-slate-800">{item.restockNumber || item.id}</div><div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(item.date)}</div><div className="text-[11px] text-slate-500 mt-0.5">Faktur: {item.invoiceNumber || '-'}</div></td>
                  <td className="py-3.5 px-4"><div className="font-bold text-slate-800">{item.productName}</div><div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.sku}</div></td>
                  <td className="py-3.5 px-3 font-semibold text-slate-700">{item.supplier || '-'}</td>
                  <td className="py-3.5 px-3"><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold"><Store className="w-3.5 h-3.5" />{item.locationName || item.location}</span></td>
                  <td className="py-3.5 px-3 text-center"><span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-black text-sm inline-block">+{item.quantity} pcs</span></td>
                  <td className="py-3.5 px-3 text-right"><div className="font-bold text-slate-800">{formatRupiah(unitCost * Number(item.quantity || 0))}</div><div className="text-[11px] text-slate-500">@{formatRupiah(unitCost)}</div></td>
                  <td className="py-3.5 px-4"><div className="flex items-center gap-1 font-semibold text-slate-700"><User className="w-3 h-3 text-slate-400" />{item.operator || '-'}</div>{item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}</td>
                  <td className="py-3.5 px-4"><div className="flex justify-center gap-1"><button onClick={()=>onEdit(item)} className="p-2 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100" title="Edit barang masuk"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={()=>onDelete(item)} className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100" title="Hapus dan batalkan dampak stok"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, icon, accent = 'slate' }: { label: string; value: string; icon: React.ReactNode; accent?: 'slate' | 'emerald' | 'rose' }) {
  const color = accent === 'emerald' ? 'bg-emerald-50 text-emerald-700' : accent === 'rose' ? 'bg-rose-50 text-[#9D6C72]' : 'bg-slate-100 text-slate-600';
  return <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between"><div><span className="text-xs font-bold uppercase text-slate-500">{label}</span><div className="text-2xl font-black text-slate-800 mt-1">{value}</div></div><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div></div>;
}
