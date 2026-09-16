import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, PackagePlus, Receipt, Store } from 'lucide-react';
import type { Product, SaleTransaction, StockAdjustment, StockRestock, StockTransfer } from '../types';
import { formatDateTime, formatRupiah, jakartaDateKey } from '../utils/formatters';

interface Props {
  products: Product[];
  transactions: SaleTransaction[];
  restocks: StockRestock[];
  transfers: StockTransfer[];
  adjustments: StockAdjustment[];
}

type EventKind = 'sale' | 'restock' | 'transfer' | 'adjustment';

interface CalendarEvent {
  id: string;
  kind: EventKind;
  dateKey: string;
  timestamp: string;
  title: string;
  detail: string;
  sku: string;
  quantity: number;
  amount?: number;
  location: string;
  locationKeys: string[];
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const KIND_META: Record<EventKind, { label: string; short: string; color: string; dot: string }> = {
  sale: { label: 'Penjualan', short: 'Jual', color: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-[#9D6C72]' },
  restock: { label: 'Barang masuk', short: 'Masuk', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  transfer: { label: 'Mutasi stok', short: 'Mutasi', color: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  adjustment: { label: 'Stok opname', short: 'Opname', color: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
};

const numberValue = (value: unknown) => Number(value || 0);

export function ActivityCalendarView({ products, transactions, restocks, transfers, adjustments }: Props) {
  const nowKey = jakartaDateKey(new Date());
  const [year, month] = nowKey.split('-').map(Number);
  const [visibleYear, setVisibleYear] = useState(year);
  const [visibleMonth, setVisibleMonth] = useState(month);
  const [selectedDate, setSelectedDate] = useState(nowKey);
  const [kindFilter, setKindFilter] = useState<'all' | EventKind>('all');
  const [skuFilter, setSkuFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const productSkuMap = useMemo(() => Object.fromEntries(products.map(product => [product.id, product.sku || ''])), [products]);
  const itemSku = (item: any) => String(item.sku || item.product?.sku || productSkuMap[item.productId || item.product?.id] || '').trim();

  const skuOptions = useMemo(() => {
    const values = new Map<string, string>();
    products.forEach(product => { if (product.sku) values.set(product.sku, product.name); });
    transactions.forEach(tx => tx.items.forEach(item => {
      const sku = itemSku(item);
      if (sku && !values.has(sku)) values.set(sku, item.productName || item.product?.name || item.name || 'Produk');
    }));
    restocks.forEach(item => { if (item.sku && !values.has(item.sku)) values.set(item.sku, item.productName); });
    transfers.forEach(item => { if (item.sku && !values.has(item.sku)) values.set(item.sku, item.productName); });
    adjustments.forEach(item => { if (item.sku && !values.has(item.sku)) values.set(item.sku, item.productName); });
    return Array.from(values, ([sku, name]) => ({ sku, name })).sort((a, b) => a.sku.localeCompare(b.sku, 'id', { numeric: true }));
  }, [products, transactions, restocks, transfers, adjustments, productSkuMap]);

  const events = useMemo(() => {
    const result: CalendarEvent[] = [];

    transactions.forEach(tx => {
      const items = Array.isArray(tx.items) ? tx.items : [];
      const transactionTotal = numberValue(tx.total ?? tx.grandTotal ?? tx.subtotal);
      const bases = items.map(item => Math.max(0, numberValue(item.subtotal ?? (numberValue(item.price ?? item.unitPrice) * numberValue(item.quantity || 1)))));
      const baseTotal = bases.reduce((sum, value) => sum + value, 0);
      let allocated = 0;
      const allocatedItems = items.map((item, index) => {
        const revenue = index === items.length - 1
          ? transactionTotal - allocated
          : baseTotal > 0 ? transactionTotal * (bases[index] / baseTotal) : (items.length ? transactionTotal / items.length : 0);
        allocated += revenue;
        return { item, revenue };
      });
      const matching = skuFilter === 'all' ? allocatedItems : allocatedItems.filter(({ item }) => itemSku(item).toLowerCase() === skuFilter.toLowerCase());
      if (!matching.length) return;
      const location = tx.bazaarName || tx.outletName || tx.stockDeductedLocationName || tx.salesChannelName || 'Lokasi tidak tercatat';
      result.push({
        id: `sale-${tx.id}`,
        kind: 'sale',
        dateKey: jakartaDateKey(tx.date),
        timestamp: tx.date,
        title: tx.transactionNumber,
        detail: matching.map(({ item }) => `${item.productName || item.product?.name || item.name || 'Produk'} (${numberValue(item.quantity || 1)} pcs)`).join(', '),
        sku: Array.from(new Set(matching.map(({ item }) => itemSku(item)).filter(Boolean))).join(', ') || '-',
        quantity: matching.reduce((sum, { item }) => sum + numberValue(item.quantity || 1), 0),
        amount: skuFilter === 'all' ? transactionTotal : matching.reduce((sum, row) => sum + row.revenue, 0),
        location,
        locationKeys: [location, tx.outletName, tx.bazaarName, tx.stockDeductedLocationName].filter(Boolean) as string[],
      });
    });

    restocks.forEach(item => {
      if (skuFilter !== 'all' && item.sku.toLowerCase() !== skuFilter.toLowerCase()) return;
      const location = item.locationName || item.location || 'Lokasi tidak tercatat';
      result.push({ id: `restock-${item.id}`, kind: 'restock', dateKey: jakartaDateKey(item.date), timestamp: item.date, title: item.restockNumber || 'Barang masuk', detail: `${item.productName} · ${item.supplier || 'Supplier tidak tercatat'}`, sku: item.sku, quantity: numberValue(item.quantity), amount: numberValue(item.purchasePrice ?? item.unitCost) * numberValue(item.quantity), location, locationKeys: [location] });
    });

    transfers.forEach(item => {
      if (skuFilter !== 'all' && item.sku.toLowerCase() !== skuFilter.toLowerCase()) return;
      const from = item.fromLocationName || item.fromLocation;
      const to = item.toLocationName || item.toLocation;
      result.push({ id: `transfer-${item.id}`, kind: 'transfer', dateKey: jakartaDateKey(item.date), timestamp: item.date, title: item.transferNumber || 'Mutasi stok', detail: `${item.productName} · ${from} → ${to}`, sku: item.sku, quantity: numberValue(item.quantity), location: `${from} → ${to}`, locationKeys: [from, to].filter(Boolean) });
    });

    adjustments.forEach(item => {
      if (skuFilter !== 'all' && item.sku.toLowerCase() !== skuFilter.toLowerCase()) return;
      const location = item.locationName || item.location || 'Lokasi tidak tercatat';
      result.push({ id: `adjustment-${item.id}`, kind: 'adjustment', dateKey: jakartaDateKey(item.date), timestamp: item.date, title: item.adjustmentNumber || 'Stok opname', detail: `${item.productName} · ${item.previousStock} → ${item.newStock ?? item.actualStock ?? 0}`, sku: item.sku, quantity: numberValue(item.difference), location, locationKeys: [location] });
    });

    return result.filter(event => {
      if (kindFilter !== 'all' && event.kind !== kindFilter) return false;
      if (locationFilter !== 'all' && !event.locationKeys.some(location => location === locationFilter)) return false;
      return true;
    }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [transactions, restocks, transfers, adjustments, skuFilter, kindFilter, locationFilter, productSkuMap]);

  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    transactions.forEach(tx => [tx.outletName, tx.bazaarName, tx.stockDeductedLocationName].forEach(value => { if (value) locations.add(value); }));
    restocks.forEach(item => { if (item.locationName || item.location) locations.add(item.locationName || item.location); });
    transfers.forEach(item => [item.fromLocationName || item.fromLocation, item.toLocationName || item.toLocation].forEach(value => { if (value) locations.add(value); }));
    adjustments.forEach(item => { if (item.locationName || item.location) locations.add(item.locationName || item.location); });
    return Array.from(locations).sort((a, b) => a.localeCompare(b, 'id'));
  }, [transactions, restocks, transfers, adjustments]);

  const monthPrefix = `${visibleYear}-${String(visibleMonth).padStart(2, '0')}`;
  const monthEvents = events.filter(event => event.dateKey.startsWith(monthPrefix));
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    monthEvents.forEach(event => map.set(event.dateKey, [...(map.get(event.dateKey) || []), event]));
    return map;
  }, [monthEvents]);
  const selectedEvents = eventsByDay.get(selectedDate) || [];

  const firstDay = new Date(visibleYear, visibleMonth - 1, 1);
  const dayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(visibleYear, visibleMonth, 0).getDate();
  const cellCount = Math.ceil((dayOffset + daysInMonth) / 7) * 7;
  const calendarCells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - dayOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const goMonth = (delta: number) => {
    const next = new Date(visibleYear, visibleMonth - 1 + delta, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth() + 1;
    setVisibleYear(nextYear);
    setVisibleMonth(nextMonth);
    setSelectedDate(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);
  };

  const summary = {
    sales: monthEvents.filter(event => event.kind === 'sale'),
    restocks: monthEvents.filter(event => event.kind === 'restock'),
    transfers: monthEvents.filter(event => event.kind === 'transfer'),
    adjustments: monthEvents.filter(event => event.kind === 'adjustment'),
  };

  return (
    <div className="space-y-5 pb-16">
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-[#9D6C72]"><CalendarDays className="w-5 h-5" /></div>
            <div><h2 className="text-xl font-black text-slate-800">Kalender Aktivitas</h2><p className="text-xs text-slate-500">Penjualan dan seluruh pergerakan stok tersusun per tanggal.</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={kindFilter} onChange={event => setKindFilter(event.target.value as 'all' | EventKind)} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold" aria-label="Filter jenis aktivitas">
              <option value="all">Semua aktivitas</option><option value="sale">Penjualan</option><option value="restock">Barang masuk</option><option value="transfer">Mutasi stok</option><option value="adjustment">Stok opname</option>
            </select>
            <select value={skuFilter} onChange={event => setSkuFilter(event.target.value)} className="max-w-[280px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold" aria-label="Filter kalender berdasarkan SKU">
              <option value="all">Semua SKU</option>{skuOptions.map(item => <option key={item.sku} value={item.sku}>{item.sku} — {item.name}</option>)}
            </select>
            <select value={locationFilter} onChange={event => setLocationFilter(event.target.value)} className="max-w-[240px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold" aria-label="Filter kalender berdasarkan lokasi">
              <option value="all">Semua lokasi</option>{locationOptions.map(location => <option key={location} value={location}>{location}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={() => setKindFilter(kindFilter === 'sale' ? 'all' : 'sale')} className="text-left p-3.5 rounded-2xl border border-rose-100 bg-rose-50/60"><span className="text-[10px] font-bold uppercase text-rose-700">Penjualan</span><strong className="block text-lg text-slate-900">{formatRupiah(summary.sales.reduce((sum, item) => sum + numberValue(item.amount), 0))}</strong><small className="text-slate-500">{summary.sales.length} transaksi · {summary.sales.reduce((sum, item) => sum + item.quantity, 0)} pcs</small></button>
          <button onClick={() => setKindFilter(kindFilter === 'restock' ? 'all' : 'restock')} className="text-left p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/60"><span className="text-[10px] font-bold uppercase text-emerald-700">Barang masuk</span><strong className="block text-lg text-slate-900">{summary.restocks.reduce((sum, item) => sum + item.quantity, 0)} pcs</strong><small className="text-slate-500">{summary.restocks.length} pencatatan</small></button>
          <button onClick={() => setKindFilter(kindFilter === 'transfer' ? 'all' : 'transfer')} className="text-left p-3.5 rounded-2xl border border-blue-100 bg-blue-50/60"><span className="text-[10px] font-bold uppercase text-blue-700">Mutasi stok</span><strong className="block text-lg text-slate-900">{summary.transfers.reduce((sum, item) => sum + item.quantity, 0)} pcs</strong><small className="text-slate-500">{summary.transfers.length} perpindahan</small></button>
          <button onClick={() => setKindFilter(kindFilter === 'adjustment' ? 'all' : 'adjustment')} className="text-left p-3.5 rounded-2xl border border-amber-100 bg-amber-50/60"><span className="text-[10px] font-bold uppercase text-amber-800">Stok opname</span><strong className="block text-lg text-slate-900">{summary.adjustments.length} catatan</strong><small className="text-slate-500">Selisih {summary.adjustments.reduce((sum, item) => sum + item.quantity, 0)} pcs</small></button>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <button onClick={() => goMonth(-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50" aria-label="Bulan sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-center"><h3 className="font-black text-slate-900">{MONTH_NAMES[visibleMonth - 1]} {visibleYear}</h3><p className="text-[11px] text-slate-500">{monthEvents.length} aktivitas sesuai filter</p></div>
          <button onClick={() => goMonth(1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50" aria-label="Bulan berikutnya"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">{DAY_NAMES.map(day => <div key={day} className="py-2 text-center text-[10px] font-black uppercase text-slate-500">{day}</div>)}</div>
        <div className="grid grid-cols-7">
          {calendarCells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="min-h-24 bg-slate-50/40 border-r border-b border-slate-100" />;
            const key = `${visibleYear}-${String(visibleMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsByDay.get(key) || [];
            const selected = key === selectedDate;
            const today = key === nowKey;
            return <button key={key} onClick={() => setSelectedDate(key)} className={`min-h-24 p-2 text-left border-r border-b border-slate-100 transition-colors ${selected ? 'bg-rose-50 ring-2 ring-inset ring-[#9D6C72]/50' : 'hover:bg-slate-50'}`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${today ? 'bg-[#9D6C72] text-white' : 'text-slate-700'}`}>{day}</span>
              <div className="mt-1 space-y-1">
                {(Object.keys(KIND_META) as EventKind[]).map(kind => {
                  const rows = dayEvents.filter(event => event.kind === kind);
                  if (!rows.length) return null;
                  return <div key={kind} className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold truncate ${KIND_META[kind].color}`}>{KIND_META[kind].short} {rows.length}{kind === 'sale' ? ` · ${rows.reduce((sum, item) => sum + item.quantity, 0)} pcs` : ''}</div>;
                })}
              </div>
            </button>;
          })}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-black text-slate-900">Aktivitas {selectedDate.split('-').reverse().join('/')}</h3><p className="text-[11px] text-slate-500">Klik tanggal pada kalender untuk melihat rinciannya.</p></div><span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600">{selectedEvents.length} aktivitas</span></div>
        {!selectedEvents.length ? <div className="py-10 text-center text-xs text-slate-400">Tidak ada aktivitas yang cocok dengan filter pada tanggal ini.</div> : <div className="space-y-2">
          {selectedEvents.map(event => {
            const Icon = event.kind === 'sale' ? Receipt : event.kind === 'restock' ? PackagePlus : event.kind === 'transfer' ? ArrowLeftRight : ClipboardCheck;
            return <article key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
              <div className={`p-2 rounded-xl border ${KIND_META[event.kind].color}`}><Icon className="w-4 h-4" /></div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><strong className="text-sm text-slate-900">{event.title}</strong><span className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${KIND_META[event.kind].color}`}>{KIND_META[event.kind].label}</span></div><p className="text-xs text-slate-600 truncate" title={event.detail}>{event.detail}</p><p className="text-[10px] text-slate-400 flex items-center gap-1"><Store className="w-3 h-3" />{event.location} · {formatDateTime(event.timestamp)}</p></div>
              <div className="text-right shrink-0"><strong className="block text-sm text-slate-900">{event.kind === 'adjustment' ? `${event.quantity > 0 ? '+' : ''}${event.quantity} pcs` : `${event.quantity} pcs`}</strong>{event.amount !== undefined && <span className="text-[11px] font-bold text-[#7C5056]">{formatRupiah(event.amount)}</span>}<small className="block text-[9px] text-slate-400">{event.sku}</small></div>
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
}
