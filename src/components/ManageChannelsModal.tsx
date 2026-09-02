import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tag, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Store, 
  Sparkles,
  MessageCircle,
  Tent,
  ShoppingBag
} from 'lucide-react';
import { SalesChannel, SalesChannelType } from '../types';
import { 
  getChannels, 
  addChannel, 
  updateChannel, 
  deleteChannel 
} from '../utils/outletStorage';

interface ManageChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ManageChannelsModal: React.FC<ManageChannelsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<SalesChannelType>('custom');
  const [description, setDescription] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = () => {
    setChannels(getChannels());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
      setDeletingChannelId(null);
      setErrorMsg(null);
    }

    window.addEventListener('channel_updated', loadData);
    return () => {
      window.removeEventListener('channel_updated', loadData);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setType('custom');
    setDescription('');
    setEditingId(null);
    setIsAddingNew(false);
    setErrorMsg(null);
    setDeletingChannelId(null);
  };

  const handleStartEdit = (channel: SalesChannel) => {
    setEditingId(channel.id);
    setName(channel.name);
    setType(channel.type);
    setDescription(channel.description || '');
    setIsAddingNew(false);
    setErrorMsg(null);
    setDeletingChannelId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
    setErrorMsg(null);
    setDeletingChannelId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama Saluran Penjualan wajib diisi.');
      return;
    }

    if (editingId) {
      const updatedList = updateChannel({
        id: editingId,
        name: trimmedName,
        type,
        description: description.trim() || undefined,
      });
      setChannels(updatedList);
      showToast(`Saluran "${trimmedName}" berhasil diperbarui.`);
    } else {
      const updatedList = addChannel({
        name: trimmedName,
        type,
        description: description.trim() || undefined,
      });
      setChannels(updatedList);
      showToast(`Saluran Penjualan baru "${trimmedName}" berhasil ditambahkan.`);
    }

    resetForm();
    if (onUpdated) onUpdated();
  };

  const confirmDelete = (channel: SalesChannel) => {
    if (channels.length <= 1) {
      setErrorMsg('Minimal harus ada 1 Saluran Penjualan.');
      setDeletingChannelId(null);
      return;
    }

    const updated = deleteChannel(channel.id);
    setChannels(updated);
    setDeletingChannelId(null);
    showToast(`Saluran "${channel.name}" berhasil dihapus.`);
    if (editingId === channel.id) resetForm();
    if (onUpdated) onUpdated();
  };

  const getChannelIcon = (chType: SalesChannelType) => {
    switch (chType) {
      case 'toko':
        return <Store className="w-4 h-4 text-emerald-600" />;
      case 'bazaar':
        return <Tent className="w-4 h-4 text-amber-600" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-[#9D6C72]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#9D6C72]/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#9D6C72] text-white shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Kelola Kategori / Saluran Penjualan
              </h3>
              <p className="text-xs text-slate-500">
                Atur saluran penjualan: Toko Offline, Bazaar, WhatsApp, Marketplace, & lainnya.
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
                <span className="text-xs font-bold text-slate-700 block">Daftar Saluran Penjualan Aktif</span>
                <span className="text-[11px] text-slate-500">Bisa menambahkan kategori penjualan baru sesuai kebutuhan</span>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3.5 py-2 bg-[#9D6C72] hover:bg-[#8B5B61] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Saluran Baru</span>
              </button>
            </div>
          )}

          {/* Add / Edit Form */}
          {(isAddingNew || editingId) && (
            <form onSubmit={handleSave} className="p-4 bg-rose-50/40 rounded-2xl border border-rose-200/80 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-rose-200/60">
                <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#9D6C72]" />
                  {editingId ? 'Edit Saluran Penjualan' : 'Tambah Saluran Penjualan Baru'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nama Saluran Penjualan: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: TikTok Shop, Shopee Live, Bazaar Ramadhan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9D6C72]/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Tipe Kategori:
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SalesChannelType)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="custom">Kustom / Lainnya (Marketplace/Event)</option>
                    <option value="toko">Toko Offline Fisik</option>
                    <option value="bazaar">Bazaar / Pameran / Event</option>
                    <option value="whatsapp">WhatsApp / Online Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Keterangan / Deskripsi:
                </label>
                <input
                  type="text"
                  placeholder="Keterangan singkat saluran..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                />
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
                  className="px-4 py-1.5 bg-[#9D6C72] hover:bg-[#8B5B61] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Saluran'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Channels */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Daftar Saluran Penjualan:</span>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {channels.map((channel) => {
                const isItemEditing = editingId === channel.id;

                return (
                  <div
                    key={channel.id}
                    className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                      isItemEditing ? 'bg-rose-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 mt-0.5">
                        {getChannelIcon(channel.type)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {channel.name}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                            {channel.type === 'toko' ? 'Toko Fisik' : channel.type === 'bazaar' ? 'Bazaar / Event' : channel.type === 'whatsapp' ? 'WhatsApp' : 'Kustom'}
                          </span>
                        </div>
                        {channel.description && (
                          <p className="text-[11px] text-slate-500">
                            {channel.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {deletingChannelId === channel.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => confirmDelete(channel)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingChannelId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(channel)}
                            className="p-1.5 text-slate-500 hover:text-[#9D6C72] hover:bg-rose-50 rounded-lg transition-colors"
                            title="Edit Saluran"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {channels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDeletingChannelId(channel.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Saluran"
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
