import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  ArrowLeftRight, 
  BarChart3, 
  PlusCircle, 
  Building2, 
  Store, 
  Sparkles, 
  ClipboardList, 
  FileSpreadsheet,
  LogOut,
  User,
  Crown,
  ChevronDown,
  ShieldCheck,
  UserCog,
  Cloud,
  CloudCheck,
  RefreshCw
} from 'lucide-react';
import { ActiveTab, Product, UserAccount } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  products: Product[];
  currentUser: UserAccount | null;
  cloudSyncState?: 'synced' | 'syncing' | 'offline';
  onForceSyncAll?: () => void;
  onLogout: () => void;
  onOpenAddProduct: () => void;
  onOpenTransfer: () => void;
  onOpenRestock: () => void;
  onOpenManageUsers?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  products,
  currentUser,
  cloudSyncState = 'synced',
  onForceSyncAll,
  onLogout,
  onOpenAddProduct,
  onOpenTransfer,
  onOpenRestock,
  onOpenManageUsers,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate total stocks
  const totalStockToko = products.reduce((acc, p) => acc + (p.stockToko || 0), 0);
  
  // Count items with low stock
  const lowStockCount = products.filter(
    (p) => p.stockToko <= p.minStockAlert
  ).length;

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Katalog & Database Stok', icon: Package, badge: products.length },
    { id: 'pos', label: 'Input Penjualan', icon: FileSpreadsheet, highlight: true },
    { id: 'transfers', label: 'Mutasi Stok', icon: ArrowLeftRight },
    { id: 'adjustments', label: 'Stok Opname', icon: ClipboardList },
    { id: 'reports', label: 'Laporan & Keuangan', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#9E6B70]/15 shadow-xs">
      {/* Top Banner / Store Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <span className="hidden sm:inline-flex px-2.5 py-0.5 text-[11px] font-bold bg-[#9E6B70]/10 text-[#8C5559] rounded-full border border-[#9E6B70]/20">
              Sistem Stok Toko & Outlet
            </span>
          </div>

          {/* Quick Location Stock Indicators & Cloud Sync */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-rose-50/80 border border-[#9E6B70]/20 rounded-xl text-xs">
              <div className="p-1 rounded-lg bg-[#9E6B70] text-white">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[#8C5559] block text-[10px] font-semibold leading-none">Total Stok Produk</span>
                <span className="font-bold text-slate-900 text-sm">{totalStockToko} pcs</span>
              </div>
            </div>

            {/* Cloud Sync Status Badge / Force Push Button - ALWAYS VISIBLE ON HP & DESKTOP */}
            <button 
              id="cloud-sync-btn"
              type="button"
              onClick={onForceSyncAll}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:opacity-90 active:scale-95 ${
                cloudSyncState === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : cloudSyncState === 'offline'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs hover:bg-emerald-100'
              }`}
              title="Klik untuk Push & Sinkronkan Seluruh Data Lokal ke Cloud Firestore"
            >
              {cloudSyncState === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span className="text-[11px] font-bold">Syncing...</span>
                </>
              ) : cloudSyncState === 'offline' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Sync Cloud</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold hidden xs:inline sm:inline">Push & Sync Cloud</span>
                  <span className="text-[11px] font-bold xs:hidden sm:hidden">Sync</span>
                </>
              )}
            </button>

            {lowStockCount > 0 && (
              <div 
                onClick={() => setActiveTab('inventory')}
                className="hidden sm:flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 hover:bg-rose-100 transition-colors font-medium"
                title={`${lowStockCount} produk stok menipis`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>{lowStockCount} Menipis</span>
              </div>
            )}
          </div>

          {/* Action Buttons & User Profile */}
          <div className="flex items-center gap-2">
            <button
              id="nav-quick-transfer-btn"
              onClick={onOpenTransfer}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
              Mutasi Stok
            </button>
            <button
              id="nav-quick-restock-btn"
              onClick={onOpenRestock}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              Stok Masuk
            </button>
            <button
              id="nav-add-product-btn"
              onClick={onOpenAddProduct}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#9E6B70] hover:bg-[#8C5559] active:scale-95 shadow-sm shadow-[#9E6B70]/30 rounded-xl transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">+ Produk Baru</span>
              <span className="sm:hidden">+ Produk</span>
            </button>

            {/* User Profile & Logout Dropdown */}
            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl transition-all"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#9E6B70] to-[#D4A373] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {currentUser.role === 'owner' ? (
                      <Crown className="w-4 h-4 text-amber-200" />
                    ) : (
                      currentUser.name.charAt(0)
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
                      {currentUser.roleLabel}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                          currentUser.role === 'owner' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {currentUser.roleLabel}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">@{currentUser.username}</p>
                      {currentUser.email && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{currentUser.email}</p>
                      )}
                    </div>

                    <div className="px-2 py-1.5 border-b border-slate-100">
                      <div className="px-2 py-1 text-[11px] text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sesi aktif & terotentikasi</span>
                      </div>
                    </div>

                    <div className="p-1.5 border-b border-slate-100">
                      <button
                        id="user-menu-sync-btn"
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onForceSyncAll) onForceSyncAll();
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CloudCheck className="w-4 h-4 text-emerald-600" />
                          <span>Push & Sync Data Cloud</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200/60 text-emerald-900 rounded-md font-bold">
                          {cloudSyncState === 'syncing' ? 'Syncing...' : 'Online'}
                        </span>
                      </button>
                    </div>

                    {/* Super Admin / Admin Options */}
                    {(currentUser.role === 'owner' || currentUser.role === 'admin') && onOpenManageUsers && (
                      <div className="p-1.5 border-b border-slate-100">
                        <button
                          id="manage-users-nav-btn"
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenManageUsers();
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-[#9E6B70] rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <UserCog className="w-4 h-4 text-[#9E6B70]" />
                          <span>Kelola Data Pengguna</span>
                        </button>
                      </div>
                    )}

                    <div className="p-1.5">
                      <button
                        id="logout-btn"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Keluar / Ganti Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Menu Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-[#9E6B70] text-white shadow-sm shadow-[#9E6B70]/20'
                    : item.highlight
                    ? 'bg-rose-50 text-[#9E6B70] hover:bg-rose-100 border border-[#9E6B70]/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-[#9E6B70]' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

