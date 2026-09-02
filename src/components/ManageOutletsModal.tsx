import React, { useState, useEffect } from 'react';
import { 
  X, 
  Store, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Star, 
  MapPin, 
  Phone,
  Building2
} from 'lucide-react';
import { StoreOutlet } from '../types';
import { 
  getOutlets, 
  addOutlet, 
  updateOutlet, 
  deleteOutlet 
} from '../utils/outletStorage';

interface ManageOutletsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ManageOutletsModal: React.FC<ManageOutletsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingOutletId, setDeletingOutletId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = () => {
    const list = getOutlets();
    setOutlets(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsAddingNew(false);
      setEditingId(null);
      setDeletingOutletId(null);
      setErrorMsg(null);
      resetForm();
    }

    window.addEventListener('outlet_updated', loadData);
    return () => {
      window.removeEventListener('outlet_updated', loadData);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCode(`TK-0${outlets.length + 1}`);
    setAddress('');
    setPhone('');
    setIsDefault(false);
    setEditingId(null);
    setIsAddingNew(false);
    setErrorMsg(null);
    setDeletingOutletId(null);
  };

  const handleStartEdit = (outlet: StoreOutlet) => {
    setEditingId(outlet.id);
    setName(outlet.name);
    setCode(outlet.code);
    setAddress(outlet.address || '');
    setPhone(outlet.phone || '');
    setIsDefault(Boolean(outlet.isDefault));
    setIsAddingNew(false);
    setErrorMsg(null);
    setDeletingOutletId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setCode(`TK-0${outlets.length + 1}`);
    setIsAddingNew(true);
    setErrorMsg(null);
    setDeletingOutletId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama Toko Offline wajib diisi.');
      return;
    }

    if (editingId) {
      const updatedList = updateOutlet({
        id: editingId,
        name: trimmedName,
        code: code.trim() || 'TK',
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        isDefault,
      });
      setOutlets(updatedList);
      showToast(`Toko Offline "${trimmedName}" berhasil diperbarui.`);
    } else {
      const updatedList = addOutlet({
        name: trimmedName,
        code: code.trim() || `TK-0${outlets.length + 1}`,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        isDefault,
      });
      setOutlets(updatedList);
      showToast(`Toko Offline baru "${trimmedName}" berhasil ditambahkan.`);
    }

    resetForm();
    if (onUpdated) onUpdated();
  };

  const confirmDelete = (outlet: StoreOutlet) => {
    if (outlets.length <= 1) {
      setErrorMsg('Tidak bisa menghapus! Minimal harus ada 1 Toko Offline terdaftar.');
      setDeletingOutletId(null);
      return;
    }

    const updated = deleteOutlet(outlet.id);
    setOutlets(updated);
    setDeletingOutletId(null);
    showToast(`Toko Offline "${outlet.name}" berhasil dihapus.`);
    if (editingId === outlet.id) resetForm();
    if (onUpdated) onUpdated();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Kelola Toko Offline / Outlet Cabang
              </h3>
              <p className="text-xs text-slate-500">
                Atur nama toko, tambah cabang toko offline baru, dan tentukan toko utama.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {toastMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
              <span>{errorMsg}</span>
              <button 
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Action to Add New */}
          {!isAddingNew && !editingId && (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Total Toko Terdaftar: {outlets.length} Lokasi</span>
                <span className="text-[11px] text-slate-500">Bisa menambah banyak cabang toko offline AQMARINE</span>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Toko Baru</span>
              </button>
            </div>
          )}

          {/* Add / Edit Form */}
          {(isAddingNew || editingId) && (
            <form onSubmit={handleSave} className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  {editingId ? 'Edit Data Toko Offline' : 'Tambah Toko Offline Baru'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nama Toko Offline: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toko Utama AQMARINE / Cabang PVJ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Kode Toko:
                  </label>
                  <input
                    type="text"
                    placeholder="TK-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Alamat / Lokasi Toko:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Riau No. 45, Bandung"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    No. Telepon / WA Toko:
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultOutlet"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isDefaultOutlet" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Jadikan sebagai Toko Utama (Default)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Toko'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Outlets */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Daftar Toko Offline Aktif:</span>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {outlets.map((outlet) => {
                const isItemEditing = editingId === outlet.id;

                return (
                  <div
                    key={outlet.id}
                    className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                      isItemEditing ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold">
                          {outlet.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {outlet.name}
                        </span>
                        {outlet.isDefault && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Toko Utama
                          </span>
                        )}
                      </div>

                      {(outlet.address || outlet.phone) && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                          {outlet.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {outlet.address}
                            </span>
                          )}
                          {outlet.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {outlet.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {deletingOutletId === outlet.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => confirmDelete(outlet)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingOutletId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(outlet)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit / Ganti Nama Toko"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {outlets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDeletingOutletId(outlet.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Toko"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
