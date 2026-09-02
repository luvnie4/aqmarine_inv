import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, RotateCcw, FolderTree, Check, Sparkles } from 'lucide-react';
import { ProductCategory } from '../types';
import { 
  getSubCategories, 
  deleteSubCategory, 
  addSubCategory, 
  resetSubCategoriesToDefault 
} from '../utils/subCategoryStorage';

interface ManageSubCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: ProductCategory;
  onUpdated?: () => void;
}

export const ManageSubCategoriesModal: React.FC<ManageSubCategoriesModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'Hijab',
  onUpdated,
}) => {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>(initialCategory);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [newSubCategoryInput, setNewSubCategoryInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [deletingSubcat, setDeletingSubcat] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      setSubCategories(getSubCategories(initialCategory));
      setNewSubCategoryInput('');
      setSuccessMessage(null);
      setErrorMessage(null);
      setDeletingSubcat(null);
      setIsResetConfirming(false);
    }

    const handleSubcatsUpdated = () => {
      setSubCategories(getSubCategories(activeCategory));
    };

    window.addEventListener('subcats_updated', handleSubcatsUpdated);
    return () => {
      window.removeEventListener('subcats_updated', handleSubcatsUpdated);
    };
  }, [isOpen, initialCategory, activeCategory]);

  useEffect(() => {
    setSubCategories(getSubCategories(activeCategory));
    setDeletingSubcat(null);
    setErrorMessage(null);
    setIsResetConfirming(false);
  }, [activeCategory]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

  const confirmDelete = (subcat: string) => {
    const updated = deleteSubCategory(activeCategory, subcat);
    setSubCategories(updated);
    setDeletingSubcat(null);
    showToast(`Sub kategori "${subcat}" berhasil dihapus.`);
    if (onUpdated) onUpdated();
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = newSubCategoryInput.trim();
    if (!trimmed) return;

    if (subCategories.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Sub kategori "${trimmed}" sudah ada di daftar.`);
      return;
    }

    const updated = addSubCategory(activeCategory, trimmed);
    setSubCategories(updated);
    setNewSubCategoryInput('');
    showToast(`Sub kategori "${trimmed}" berhasil ditambahkan.`);
    if (onUpdated) onUpdated();
  };

  const confirmReset = () => {
    const defaults = resetSubCategoriesToDefault(activeCategory);
    setSubCategories(defaults);
    setIsResetConfirming(false);
    showToast(`Daftar sub kategori ${activeCategory} berhasil dikembalikan ke bawaan.`);
    if (onUpdated) onUpdated();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#9D6C72]/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#9D6C72] text-white">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Kelola & Hapus Sub Kategori
              </h3>
              <p className="text-xs text-slate-500">
                Hapus atau tambah daftar sub kategori hijab dan mukena AQMARINE.
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

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Toast Notification */}
          {successMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
              <span>{errorMessage}</span>
              <button 
                type="button"
                onClick={() => setErrorMessage(null)} 
                className="text-rose-500 hover:text-rose-800 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Reset Confirmation Banner */}
          {isResetConfirming && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in">
              <p className="text-xs font-bold text-amber-900">
                Kembalikan semua sub kategori {activeCategory} ke daftar bawaan awal?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmReset}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Ya, Kembalikan ke Default
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetConfirming(false)}
                  className="px-3 py-1.5 bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/50 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Category Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveCategory('Hijab')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'Hijab'
                  ? 'bg-white text-[#9D6C72] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hijab / Jilbab ({getSubCategories('Hijab').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('Mukena')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'Mukena'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mukena / Prayer Set ({getSubCategories('Mukena').length})
            </button>
          </div>

          {/* Add New Subcategory Input */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder={`Tambah sub kategori ${activeCategory} baru...`}
              value={newSubCategoryInput}
              onChange={(e) => {
                setNewSubCategoryInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9D6C72]/20"
            />
            <button
              type="submit"
              disabled={!newSubCategoryInput.trim()}
              className="px-3.5 py-2 bg-[#9D6C72] hover:bg-[#8B5B61] disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </form>

          {/* List of Subcategories with Delete Button */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>Daftar Sub Kategori Saat Ini:</span>
              <span className="text-[11px] font-normal text-slate-400">
                Total: {subCategories.length} pilihan
              </span>
            </div>

            {subCategories.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-2">Belum ada sub kategori untuk {activeCategory}.</p>
                <button
                  type="button"
                  onClick={confirmReset}
                  className="text-xs font-bold text-[#9D6C72] hover:underline"
                >
                  Pulihkan ke daftar bawaan
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/40">
                {subCategories.map((subcat, idx) => (
                  <div
                    key={subcat}
                    className="flex items-center justify-between p-3 bg-white hover:bg-rose-50/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {subcat}
                      </span>
                    </div>

                    {deletingSubcat === subcat ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <span className="text-[11px] font-bold text-rose-700 mr-1 hidden sm:inline">
                          Hapus item ini?
                        </span>
                        <button
                          type="button"
                          onClick={() => confirmDelete(subcat)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSubcat(null)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingSubcat(subcat)}
                        title={`Hapus "${subcat}"`}
                        className="px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 group border border-transparent hover:border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-rose-600">Hapus</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset to Defaults Option */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResetConfirming(true)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Daftar Bawaan</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Selesai
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
