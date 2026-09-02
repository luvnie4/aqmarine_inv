import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tent, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  MapPin, 
  Calendar, 
  User, 
  Phone,
  Store,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BazaarEvent } from '../types';
import { 
  getBazaarEvents, 
  addBazaarEvent, 
  updateBazaarEvent, 
  deleteBazaarEvent,
  setActiveBazaarEvent 
} from '../utils/bazaarStorage';
import { 
  COLLECTIONS, 
  syncCollectionToFirestore, 
  saveDocToFirestore,
  deleteDocFromFirestore 
} from '../lib/firebase';

interface ManageBazaarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBazaar?: (bazaar: BazaarEvent) => void;
  onUpdated?: () => void;
}

export const ManageBazaarsModal: React.FC<ManageBazaarsModalProps> = ({
  isOpen,
  onClose,
  onSelectBazaar,
  onUpdated,
}) => {
  const [bazaars, setBazaars] = useState<BazaarEvent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [picName, setPicName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = () => {
    setBazaars(getBazaarEvents());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
      setDeletingId(null);
      setErrorMsg(null);
    }

    window.addEventListener('bazaar_updated', loadData);
    return () => {
      window.removeEventListener('bazaar_updated', loadData);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setLocation('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setPicName('');
    setPhone('');
    setIsActive(true);
    setNotes('');
    setEditingId(null);
    setIsAddingNew(false);
    setErrorMsg(null);
    setDeletingId(null);
  };

  const handleStartEdit = (bazaar: BazaarEvent) => {
    setEditingId(bazaar.id);
    setName(bazaar.name);
    setLocation(bazaar.location || '');
    setStartDate(bazaar.startDate || '');
    setEndDate(bazaar.endDate || '');
    setPicName(bazaar.picName || '');
    setPhone(bazaar.phone || '');
    setIsActive(bazaar.isActive || false);
    setNotes(bazaar.notes || '');
    setIsAddingNew(false);
    setErrorMsg(null);
    setDeletingId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
    setErrorMsg(null);
    setDeletingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama Bazaar / Event wajib diisi!');
      return;
    }

    if (editingId) {
      const existing = bazaars.find((b) => b.id === editingId);
      if (!existing) return;

      const updatedObj: BazaarEvent = {
        ...existing,
        name: trimmedName,
        location: location.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        picName: picName.trim() || undefined,
        phone: phone.trim() || undefined,
        isActive,
        notes: notes.trim() || undefined,
      };

      const updatedList = updateBazaarEvent(updatedObj);
      setBazaars(updatedList);
      syncCollectionToFirestore(COLLECTIONS.BAZAARS, updatedList).catch(console.warn);
      showToast(`Bazaar "${trimmedName}" berhasil diperbarui.`);
      resetForm();
      if (onUpdated) onUpdated();
    } else {
      const newBazaars = addBazaarEvent({
        name: trimmedName,
        location: location.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        picName: picName.trim() || undefined,
        phone: phone.trim() || undefined,
        isActive,
        notes: notes.trim() || undefined,
      });

      setBazaars(newBazaars);
      syncCollectionToFirestore(COLLECTIONS.BAZAARS, newBazaars).catch(console.warn);
      const created = newBazaars.find(b => b.name === trimmedName) || newBazaars[0];
      showToast(`Bazaar "${trimmedName}" berhasil ditambahkan & disimpan!`);
      resetForm();
      if (onUpdated) onUpdated();
      if (onSelectBazaar && created) {
        onSelectBazaar(created);
      }
    }
  };

  const handleDelete = (id: string) => {
    const target = bazaars.find((b) => b.id === id);
    if (!target) return;

    const updated = deleteBazaarEvent(id);
    setBazaars(updated);
    deleteDocFromFirestore(COLLECTIONS.BAZAARS, id).catch(console.warn);
    syncCollectionToFirestore(COLLECTIONS.BAZAARS, updated).catch(console.warn);
    setDeletingId(null);
    showToast(`Bazaar "${target.name}" telah dihapus.`);
    if (onUpdated) onUpdated();
  };

  const handleSelectActive = (bazaar: BazaarEvent) => {
    const updated = setActiveBazaarEvent(bazaar.id);
    setBazaars(updated);
    syncCollectionToFirestore(COLLECTIONS.BAZAARS, updated).catch(console.warn);
    showToast(`Bazaar "${bazaar.name}" dipilih sebagai event aktif.`);
    if (onUpdated) onUpdated();
    if (onSelectBazaar) {
      onSelectBazaar(bazaar);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Tent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Kelola Daftar Bazaar & Event</h2>
              <p className="text-xs text-slate-500">
                Tambah, atur lokasi booth, dan pilih event aktif untuk pencatatan kasir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast / Error alerts */}
        {toastMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-800 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Top Actions: Add New Bazaar button */}
          {!isAddingNew && !editingId && (
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-600">
                Total terdaftar: <strong className="text-slate-900">{bazaars.length} Event Bazaar</strong>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                + Tambah Bazaar Baru
              </button>
            </div>
          )}

          {/* ADD / EDIT FORM */}
          {(isAddingNew || editingId) && (
            <form onSubmit={handleSave} className="p-5 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  {editingId ? 'Edit Data Bazaar / Event' : 'Form Tambah Bazaar / Event Baru'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nama Bazaar */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Bazaar / Event <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bazaar RSHS, Bazaar Ramadhan PVJ, Hijab Fest..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Lokasi / Booth */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lokasi / Nama Gedung & Nomor Booth:
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Contoh: Lobby Utama RSHS Bandung - Booth B-04"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Tanggal Mulai & Selesai */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Mulai:
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Selesai (Opsional):
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* PIC & Kontak */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    PIC / Kasir Jaga:
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Nama Kasir / Staff Jaga"
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    No. HP / WhatsApp PIC:
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="0812-xxxx-xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Set as active toggle */}
                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Jadikan sebagai Bazaar Aktif saat ini di Formulir Penjualan
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? 'Simpan Perubahan' : 'Simpan Bazaar'}
                </button>
              </div>
            </form>
          )}

          {/* LIST OF BAZAARS */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Daftar Bazaar / Event Tersimpan:
            </span>

            {bazaars.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Belum ada data event bazaar tersimpan.
              </div>
            ) : (
              bazaars.map((b) => {
                const isDeleting = deletingId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      b.isActive
                        ? 'bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-400/40'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-1 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                          <Tent className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                        {b.isActive && (
                          <span className="px-2 py-0.5 bg-amber-500 text-white font-extrabold text-[10px] rounded-full shadow-2xs">
                            Sedang Aktif
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                          Sumber: {b.defaultDeductLocation === 'gudang' ? 'Stok Pusat' : 'Stok Toko'}
                        </span>
                      </div>

                      {b.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{b.location}</span>
                        </div>
                      )}

                      {(b.startDate || b.picName) && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          {b.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {b.startDate} {b.endDate ? `s/d ${b.endDate}` : ''}
                            </span>
                          )}
                          {b.picName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              PIC: <strong>{b.picName}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {!b.isActive && (
                        <button
                          type="button"
                          onClick={() => handleSelectActive(b)}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 font-bold text-xs rounded-xl transition-all"
                        >
                          Pilih Event Ini
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEdit(b)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                        title="Edit Data Bazaar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {isDeleting ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                          <span className="text-[10px] font-bold text-red-700 px-1">Hapus?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(b.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Hapus Bazaar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Setiap transaksi di kasir dengan saluran "Bazaar" akan tercatat di event yang dipilih.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
