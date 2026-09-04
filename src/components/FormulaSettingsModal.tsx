import React, { useState } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  Crown, 
  PieChart as PieChartIcon, 
  Building2, 
  Wallet,
  Calculator,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  ProfitFormulaSettings, 
  DEFAULT_FORMULA_SETTINGS 
} from '../utils/profitFormulaStorage';
import { formatRupiah } from '../utils/formatters';

interface FormulaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProfitFormulaSettings;
  onSave: (newSettings: ProfitFormulaSettings) => void;
}

export const FormulaSettingsModal: React.FC<FormulaSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [draft, setDraft] = useState<ProfitFormulaSettings>(settings);
  const [activeTab, setActiveTab] = useState<'hijab' | 'mukena' | 'other'>('hijab');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync draft when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setSaveSuccess(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const currentCfg = draft[activeTab];

  const updateCurrent = (key: keyof typeof currentCfg, val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setDraft(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [key]: clamped,
      }
    }));
  };

  const handleApplyToBoth = (sourceTab: 'hijab' | 'mukena') => {
    const src = draft[sourceTab];
    setDraft(prev => ({
      ...prev,
      hijab: { ...src },
      mukena: { ...src },
      other: { ...src },
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan semua persentase rumus ke standar default butik AQMARINE?')) {
      setDraft(DEFAULT_FORMULA_SETTINGS);
    }
  };

  const handleSave = () => {
    onSave(draft);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  // Mathematical breakdown simulation with Rp 1.000.000 Laba Kotor
  const simLabaKotor = 1000000;
  const simInvestor = simLabaKotor * (currentCfg.investorPercent / 100);
  const simSisa1 = Math.max(0, simLabaKotor - simInvestor);
  const simOwner = simSisa1 * (currentCfg.ownerPercent / 100);
  const simSisa2 = Math.max(0, simSisa1 - simOwner);
  const simOperasional = simSisa2 * (currentCfg.operasionalPercent / 100);
  const simKembaliModal = simSisa2 * (currentCfg.kembaliModalPercent / 100);

  // Effective percentages of Laba Kotor
  const effInvestor = currentCfg.investorPercent;
  const effOwner = ((100 - effInvestor) * currentCfg.ownerPercent) / 100;
  const remAfterOwner = 100 - effInvestor - effOwner;
  const effOps = (remAfterOwner * currentCfg.operasionalPercent) / 100;
  const effModal = (remAfterOwner * currentCfg.kembaliModalPercent) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-100 text-[#9E6B70]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Atur Rumus & Persentase Bagi Hasil
              </h2>
              <p className="text-xs text-slate-500">
                Kustomisasi fleksibel pembagian laba untuk Hijab, Mukena, dan Kategori lainnya
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">

          {/* Tab Selector & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('hijab')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'hijab'
                    ? 'bg-[#9E6B70] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>🌸</span>
                <span>Rumus Hijab</span>
                {draft.hijab.investorPercent > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 font-extrabold">
                    Inv {draft.hijab.investorPercent}%
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mukena')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'mukena'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>🥻</span>
                <span>Rumus Mukena</span>
                {draft.mukena.investorPercent > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 font-extrabold">
                    Inv {draft.mukena.investorPercent}%
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('other')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'other'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>🏷️ Produk Lainnya</span>
              </button>
            </div>

            {/* Tombol Cepat: Terapkan Laba Investor ke Keduanya */}
            <button
              type="button"
              onClick={() => handleApplyToBoth(activeTab)}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
              title="Salin persentase rumus tab aktif saat ini ke kategori Hijab & Mukena sekaligus"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Terapkan ke Keduanya</span>
            </button>
          </div>

          {/* Formulir Input Persentase */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Konfigurasi Persentase:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-[#8C5559] border border-rose-200">
                  {activeTab === 'hijab' ? '🌸 Kategori Hijab' : activeTab === 'mukena' ? '🥻 Kategori Mukena' : '🏷️ Kategori Lainnya'}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Bisa diedit angka persentasenya</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 1. Laba Investor */}
              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-purple-950">
                    <PieChartIcon className="w-4 h-4 text-purple-700" />
                    <span>1. Laba Investor</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                    % Laba Kotor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={currentCfg.investorPercent}
                    onChange={(e) => updateCurrent('investorPercent', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-purple-300 rounded-xl text-base font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-black text-purple-900">%</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {currentCfg.investorPercent === 0 
                    ? 'Tidak ada bagian investor (0%). Seluruh laba dialokasikan untuk owner, operasional, dan modal.' 
                    : `Investor menerima ${currentCfg.investorPercent}% langsung dari Laba Kotor produk.`}
                </p>
              </div>

              {/* 2. Laba Owner */}
              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#8C5559]">
                    <Crown className="w-4 h-4 text-[#9E6B70]" />
                    <span>2. Laba Owner</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#8C5559] bg-rose-100 px-1.5 py-0.5 rounded">
                    % dari Sisa setelah Investor
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={currentCfg.ownerPercent}
                    onChange={(e) => updateCurrent('ownerPercent', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-rose-300 rounded-xl text-base font-black text-[#8C5559] focus:outline-none focus:ring-2 focus:ring-[#9E6B70]"
                  />
                  <span className="text-sm font-black text-[#8C5559]">%</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Diambil {currentCfg.ownerPercent}% dari sisa laba setelah potongan investor. 
                  (Setara <strong>{effOwner.toFixed(1)}%</strong> dari total Laba Kotor).
                </p>
              </div>

              {/* 3. Operasional Toko */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-950">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>3. Operasional Toko</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    % dari Sisa Akhir
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={currentCfg.operasionalPercent}
                    onChange={(e) => updateCurrent('operasionalPercent', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-blue-300 rounded-xl text-base font-black text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-black text-blue-900">%</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Diambil {currentCfg.operasionalPercent}% dari sisa bersih setelah potongan owner.
                  (Setara <strong>{effOps.toFixed(1)}%</strong> dari total Laba Kotor).
                </p>
              </div>

              {/* 4. Kembali ke Modal */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    <span>4. Kembali ke Modal</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    % dari Sisa Akhir
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={currentCfg.kembaliModalPercent}
                    onChange={(e) => updateCurrent('kembaliModalPercent', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-base font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-black text-emerald-900">%</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Diambil {currentCfg.kembaliModalPercent}% dari sisa bersih setelah potongan owner.
                  (Setara <strong>{effModal.toFixed(1)}%</strong> dari total Laba Kotor).
                </p>
              </div>

            </div>
          </div>

          {/* Live Simulator Preview */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                <Calculator className="w-4 h-4 text-[#9E6B70]" />
                <span>Simulasi Perhitungan Nyata (Contoh Laba Kotor Rp 1.000.000):</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                Total Alokasi: {(effInvestor + effOwner + effOps + effModal).toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-[10px] text-purple-700 block font-bold">Investor</span>
                <span className="text-sm font-black text-purple-900 block mt-0.5">
                  {formatRupiah(simInvestor)}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{effInvestor.toFixed(1)}% Laba Kotor</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-rose-100 shadow-2xs">
                <span className="text-[10px] text-[#8C5559] block font-bold">Owner</span>
                <span className="text-sm font-black text-[#8C5559] block mt-0.5">
                  {formatRupiah(simOwner)}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{effOwner.toFixed(1)}% Laba Kotor</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-[10px] text-blue-700 block font-bold">Operasional</span>
                <span className="text-sm font-black text-blue-900 block mt-0.5">
                  {formatRupiah(simOperasional)}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{effOps.toFixed(1)}% Laba Kotor</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] text-emerald-700 block font-bold">Kembali Modal</span>
                <span className="text-sm font-black text-emerald-900 block mt-0.5">
                  {formatRupiah(simKembaliModal)}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{effModal.toFixed(1)}% Laba Kotor</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-[#9E6B70] hover:bg-[#8C5559] text-white rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan & Terapkan Rumus</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
