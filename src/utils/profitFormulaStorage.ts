export interface CategoryFormulaConfig {
  investorPercent: number;    // % dari Laba Kotor
  ownerPercent: number;       // % dari sisa setelah investor (atau dari laba kotor jika investor 0%)
  operasionalPercent: number; // % dari sisa setelah owner (biasanya 50%)
  kembaliModalPercent: number;// % dari sisa setelah owner (biasanya 50%)
}

export interface ProfitFormulaSettings {
  hijab: CategoryFormulaConfig;
  mukena: CategoryFormulaConfig;
  other: CategoryFormulaConfig;
}

export const DEFAULT_FORMULA_SETTINGS: ProfitFormulaSettings = {
  hijab: {
    investorPercent: 0,       // Default sebelumnya 0% investor untuk hijab
    ownerPercent: 30,          // 30% Laba Owner
    operasionalPercent: 50,    // 50% dari sisa (35% total)
    kembaliModalPercent: 50,   // 50% dari sisa (35% total)
  },
  mukena: {
    investorPercent: 30,       // 30% Investor dari Laba Kotor
    ownerPercent: 30,          // 30% Owner dari sisa pertama (21% total)
    operasionalPercent: 50,    // 50% dari sisa kedua (24.5% total)
    kembaliModalPercent: 50,   // 50% dari sisa kedua (24.5% total)
  },
  other: {
    investorPercent: 0,
    ownerPercent: 30,
    operasionalPercent: 50,
    kembaliModalPercent: 50,
  }
};

const STORAGE_KEY = 'aqmarine_profit_loss_formula_settings_v1';

export function getProfitFormulaSettings(): ProfitFormulaSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FORMULA_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      hijab: { ...DEFAULT_FORMULA_SETTINGS.hijab, ...(parsed.hijab || {}) },
      mukena: { ...DEFAULT_FORMULA_SETTINGS.mukena, ...(parsed.mukena || {}) },
      other: { ...DEFAULT_FORMULA_SETTINGS.other, ...(parsed.other || {}) },
    };
  } catch (err) {
    console.error('Failed to load formula settings from localStorage:', err);
    return DEFAULT_FORMULA_SETTINGS;
  }
}

export function saveProfitFormulaSettings(settings: ProfitFormulaSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save formula settings to localStorage:', err);
  }
}

export function resetProfitFormulaSettings(): ProfitFormulaSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset formula settings:', err);
  }
  return DEFAULT_FORMULA_SETTINGS;
}
