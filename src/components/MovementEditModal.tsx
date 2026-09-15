import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import type { AdjustmentReason, Product, StockAdjustment, StockRestock, StockTransfer } from '../types';
import { getOutlets } from '../utils/outletStorage';

type Kind = 'transfers' | 'adjustments' | 'restocks';
type RecordType = StockTransfer | StockAdjustment | StockRestock;

interface Props {
  kind: Kind;
  record: RecordType | null;
  products: Product[];
  onClose: () => void;
  onSave: (record: RecordType, updateHpp: boolean) => Promise<boolean>;
}

export function MovementEditModal({ kind, record, products, onClose, onSave }: Props) {
  const outlets = getOutlets();
  const [productId, setProductId] = useState('');
  const [location, setLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [actualStock, setActualStock] = useState<number | ''>(0);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [unitCost, setUnitCost] = useState<number | ''>(0);
  const [updateHpp, setUpdateHpp] = useState(false);
  const [reason, setReason] = useState<AdjustmentReason>('koreksi_fisik');
  const [operator, setOperator] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) return;
    setProductId(record.productId);
    setQuantity('quantity' in record ? Number(record.quantity) : 1);
    setOperator(record.operator || '');
    setNotes(record.notes || '');
    if (kind === 'transfers') {
      const value = record as StockTransfer;
      setLocation(value.fromLocationId || value.fromLocation);
      setToLocation(value.toLocationId || value.toLocation);
    } else if (kind === 'adjustments') {
      const value = record as StockAdjustment;
      setLocation(value.locationId || value.location);
      setActualStock(Number(value.actualStock ?? value.newStock ?? 0));
      setReason(value.reason as AdjustmentReason);
    } else {
      const value = record as StockRestock;
      setLocation(value.locationId || value.location);
      setSupplier(value.supplier || '');
      setInvoiceNumber(value.invoiceNumber || '');
      setUnitCost(Number(value.purchasePrice ?? value.unitCost ?? 0));
      setUpdateHpp(Boolean(value.updateProductHpp));
    }
  }, [record, kind]);

  if (!record) return null;
  const product = products.find(item => item.id === productId);
  const locationName = (id: string) => {
    const outlet = outlets.find(item => item.id === id);
    return outlet ? `${outlet.name} (${outlet.code})` : id;
  };
  const title = kind === 'restocks' ? 'Edit Barang Masuk' : kind === 'transfers' ? 'Edit Mutasi Stok' : 'Edit Stok Opname';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product || saving) return;
    let next: RecordType;
    if (kind === 'transfers') {
      next = { ...(record as StockTransfer), productId, productName:product.name, sku:product.sku, fromLocation:location, fromLocationName:locationName(location), toLocation, toLocationName:locationName(toLocation), quantity:Number(quantity), operator:operator.trim() || 'Staff', notes:notes.trim() || undefined };
    } else if (kind === 'adjustments') {
      next = { ...(record as StockAdjustment), productId, productName:product.name, sku:product.sku, location, locationName:locationName(location), actualStock:Number(actualStock), newStock:Number(actualStock), reason, operator:operator.trim() || 'Staff', notes:notes.trim() || undefined };
    } else {
      next = { ...(record as StockRestock), productId, productName:product.name, sku:product.sku, location, locationName:locationName(location), quantity:Number(quantity), supplier:supplier.trim() || undefined, invoiceNumber:invoiceNumber.trim() || undefined, unitCost:Number(unitCost), purchasePrice:Number(unitCost), operator:operator.trim() || 'Staff', notes:notes.trim() || undefined };
    }
    setSaving(true);
    try { if (await onSave(next, updateHpp)) onClose(); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <form onSubmit={submit} className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#FBF8F6]"><div><h3 className="font-black text-slate-800">{title}</h3><p className="text-xs text-slate-500">Dampak stok lama akan dibalik sebelum perubahan diterapkan.</p></div><button type="button" onClick={onClose} aria-label="Tutup"><X className="w-5 h-5" /></button></div>
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <Field label="Produk"><select value={productId} onChange={e=>setProductId(e.target.value)} className="input"><option value="">Pilih produk</option>{products.map(item=><option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select></Field>
        {kind === 'transfers' ? <div className="grid grid-cols-2 gap-3"><Field label="Dari lokasi"><LocationSelect value={location} setValue={setLocation} outlets={outlets} /></Field><Field label="Ke lokasi"><LocationSelect value={toLocation} setValue={setToLocation} outlets={outlets} /></Field></div> : <Field label="Lokasi"><LocationSelect value={location} setValue={setLocation} outlets={outlets} /></Field>}
        {kind !== 'adjustments' && <Field label="Jumlah (pcs)"><input type="number" min="1" required value={quantity} onChange={e=>setQuantity(e.target.value===''?'':Number(e.target.value))} className="input" /></Field>}
        {kind === 'adjustments' && <><Field label="Stok fisik aktual"><input type="number" min="0" required value={actualStock} onChange={e=>setActualStock(e.target.value===''?'':Number(e.target.value))} className="input" /></Field><Field label="Alasan"><select value={reason} onChange={e=>setReason(e.target.value as AdjustmentReason)} className="input"><option value="koreksi_fisik">Koreksi fisik</option><option value="rusak">Rusak</option><option value="hilang">Hilang</option><option value="sample_display">Sampel display</option><option value="retur">Retur</option><option value="lainnya">Lainnya</option></select></Field></>}
        {kind === 'restocks' && <><div className="grid grid-cols-2 gap-3"><Field label="Supplier"><input value={supplier} onChange={e=>setSupplier(e.target.value)} className="input" /></Field><Field label="No. faktur / SJ"><input value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} className="input" /></Field></div><Field label="HPP satuan"><input type="number" min="0" value={unitCost} onChange={e=>setUnitCost(e.target.value===''?'':Number(e.target.value))} className="input" /></Field><label className="flex gap-2 text-xs text-slate-700"><input type="checkbox" checked={updateHpp} onChange={e=>setUpdateHpp(e.target.checked)} /> Perbarui HPP produk dengan nilai ini</label></>}
        <div className="grid grid-cols-2 gap-3"><Field label="Petugas"><input value={operator} onChange={e=>setOperator(e.target.value)} className="input" /></Field><Field label="Catatan"><input value={notes} onChange={e=>setNotes(e.target.value)} className="input" /></Field></div>
      </div>
      <div className="p-4 bg-slate-50 border-t flex justify-end gap-2"><button type="button" onClick={onClose} className="secondary-button">Batal</button><button disabled={saving || !product || (kind==='transfers' && location===toLocation)} className="primary-button"><Save className="w-4 h-4" />{saving?'Menyimpan…':'Simpan koreksi'}</button></div>
    </form>
  </div>;
}

function Field({ label, children }: { label:string; children:React.ReactNode }) { return <label className="block text-xs font-bold text-slate-700 space-y-1.5"><span>{label}</span>{children}</label>; }
function LocationSelect({ value, setValue, outlets }: { value:string; setValue:(value:string)=>void; outlets:Array<{id:string;name:string;code:string}> }) { return <select required value={value} onChange={e=>setValue(e.target.value)} className="input"><option value="">Pilih lokasi</option>{outlets.map(item=><option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select>; }
