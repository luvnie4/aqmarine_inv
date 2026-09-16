import React from 'react';
import { LayoutDashboard, Package, ShoppingBag, ArrowLeftRight, ClipboardList, ChartNoAxesCombined, Calculator, CalendarDays, Plus, RefreshCw, LogOut, Users, CloudCheck, CloudOff } from './UiIcons';
import { BrandLogo } from './BrandLogo';
import type { ActiveTab, Product, UserAccount } from '../types';
interface Props {
  activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void; products: Product[]; currentUser: UserAccount | null;
  cloudSyncState?: 'synced' | 'syncing' | 'offline'; onForceSyncAll?: () => void; onLogout: () => void;
  onOpenAddProduct: () => void; onOpenTransfer: () => void; onOpenRestock: () => void; onOpenManageUsers?: () => void;
}
export function Navbar(p: Props) {
 const owner = ['owner', 'superadmin'].includes(p.currentUser?.role || '');
 const items = [
  { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'inventory', label: 'Koleksi & stok', icon: Package },
  { id: 'pos', label: 'Penjualan', icon: ShoppingBag },
  { id: 'restocks', label: 'Barang masuk', icon: Package },
  { id: 'transfers', label: 'Mutasi stok', icon: ArrowLeftRight },
  { id: 'adjustments', label: 'Stok opname', icon: ClipboardList },
  { id: 'calendar', label: 'Kalender aktivitas', icon: CalendarDays },
  { id: 'reports', label: 'Laporan', icon: ChartNoAxesCombined },
  ...(owner ? [{ id: 'profit_loss', label: 'Laba & rugi', icon: Calculator }] : []),
 ];
 return <><aside className="sidebar">
  <div className="sidebar-brand"><BrandLogo size="md" /></div><p className="sidebar-label">RUANG KERJA</p>
  <nav aria-label="Navigasi utama">{items.map(({id,label,icon:Icon}) => <button key={id} aria-current={p.activeTab === id ? 'page' : undefined} className={p.activeTab === id ? 'nav-link active' : 'nav-link'} onClick={() => p.setActiveTab(id as ActiveTab)}><Icon size={19}/><span>{label}</span>{id === 'inventory' && <small>{p.products.length}</small>}</button>)}</nav>
  <div className="sidebar-bottom"><div className="stock-note"><Package size={20}/><div><strong>{p.products.reduce((n,item)=>n+(item.stockToko || 0),0).toLocaleString('id-ID')} pcs</strong><span>Stok tersedia di toko</span></div></div>
  <button className="nav-link" onClick={p.onOpenManageUsers}><Users size={18}/> {owner ? 'Kelola pengguna' : 'Akun saya'}</button>
  <button className="nav-link" onClick={p.onLogout}><LogOut size={18}/> Keluar</button><p className="sidebar-footnote">AQMARINE · INVENTORI</p><a className="icon-credit" href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer">Uicons by Flaticon</a></div>
 </aside><header className="workspace-header"><div><span className="header-context">Butik / Ruang kerja</span><h1>{items.find(item=>item.id===p.activeTab)?.label || 'Penjualan'}</h1></div>
 <div className="header-actions"><button id="cloud-sync-btn" onClick={p.onForceSyncAll} className="sync-button" aria-label="Muat ulang data dari server" title="Muat ulang data dari server">{p.cloudSyncState === 'synced' ? <CloudCheck size={17}/> : p.cloudSyncState === 'offline' ? <CloudOff size={17}/> : <RefreshCw size={17} className="animate-spin"/>}<span>{p.cloudSyncState === 'synced' ? 'Terhubung' : p.cloudSyncState === 'offline' ? 'Belum terhubung' : 'Memuat…'}</span></button><button className="primary-button compact" onClick={p.onOpenAddProduct}><Plus size={17}/><span>Produk baru</span></button><div className="user-avatar" title={p.currentUser?.name}>{p.currentUser?.name?.slice(0,1)}</div></div></header></>;
}
