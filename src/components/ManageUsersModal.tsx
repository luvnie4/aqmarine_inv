import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { deleteStaffProfile, saveStaffProfile } from '../lib/supabase';
import { fetchUsersFromCloud } from '../utils/userStorage';
import type { UserAccount, UserRole } from '../types';

interface Props { isOpen:boolean; onClose:()=>void; currentUser:UserAccount|null; onCurrentUserUpdated?:(user:UserAccount)=>void; onUsersUpdated?:()=>void }
const emptyProfile = (): UserAccount => ({ id:'', name:'', username:'', email:'', role:'admin' });
const profileId = (email: string) => `staff-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

export function ManageUsersModal({isOpen,onClose,currentUser,onCurrentUserUpdated,onUsersUpdated}:Props) {
 const owner = ['owner','superadmin'].includes(currentUser?.role || '');
 const [users,setUsers]=useState<UserAccount[]>([]); const [draft,setDraft]=useState<UserAccount>(emptyProfile());
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
 const load = async () => { try { setUsers(owner ? await fetchUsersFromCloud() : currentUser ? [currentUser] : []); } catch { setError('Daftar pengguna belum dapat dimuat.'); } };
 useEffect(()=>{ if(isOpen) { void load(); if(!owner && currentUser) setDraft(currentUser); } },[isOpen,currentUser?.id]);
 if(!isOpen)return null;
 async function save(e:React.FormEvent) { e.preventDefault(); if(busy)return; setBusy(true);setError('');setMessage('');
  try { const email=(draft.email||'').trim().toLowerCase(); const profile={...draft,id:draft.id||profileId(email),email,username:draft.username||email}; await saveStaffProfile(profile); if(profile.id===currentUser?.id)onCurrentUserUpdated?.(profile); setDraft(profile); await load();onUsersUpdated?.();setMessage('Profil akses tersimpan.'); }
  catch {setError('Profil gagal disimpan. Periksa akses dan koneksi.');}finally{setBusy(false);}
 }
 async function revoke(user:UserAccount) { if(!window.confirm('Cabut akses aplikasi untuk '+user.name+'?'))return; setBusy(true);try{await deleteStaffProfile(user.id);await load();}catch{setError('Akses gagal dicabut.');}finally{setBusy(false);} }
 return <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="users-title" className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"><div className="flex justify-between items-center mb-5"><h2 id="users-title" className="text-xl font-semibold flex gap-2"><Users/>{owner?'Kelola pengguna':'Akun saya'}</h2><button onClick={onClose} aria-label="Tutup"><X/></button></div>
 {error&&<p role="alert" className="app-alert">{error}</p>}{message&&<p role="status" className="p-3 text-emerald-700">{message}</p>}
 {owner&&<><p className="text-sm text-slate-600 mb-4">Daftarkan alamat email di sini, lalu buat pengguna dengan email yang sama di Supabase Authentication. Kata sandi hanya dikelola oleh Supabase dan tidak disimpan di profil aplikasi.</p><div className="space-y-2 mb-5">{users.map(user=><div key={user.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3"><button onClick={()=>setDraft(user)} className="text-left"><strong>{user.name}</strong><span className="block text-sm text-slate-500">{user.email} · {user.role}</span></button>{user.id!==currentUser?.id&&<button disabled={busy} onClick={()=>revoke(user)} className="text-sm text-rose-700">Cabut akses</button>}</div>)}</div><button className="secondary-button mb-4" onClick={()=>setDraft(emptyProfile())}>Profil baru</button></>}
 <form onSubmit={save} className="grid gap-3"><label className="text-sm">Nama<input required className="block w-full border rounded-lg p-3 mt-1" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="text-sm">Email login Supabase<input required type="email" disabled={!owner || Boolean(draft.id)} className="block w-full border rounded-lg p-3 mt-1" value={draft.email||''} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>{owner&&<label className="text-sm">Peran<select disabled={draft.id===currentUser?.id} className="block w-full border rounded-lg p-3 mt-1" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value as UserRole})}>{['owner','admin','gudang','kasir'].map(role=><option key={role}>{role}</option>)}</select></label>}<button disabled={busy} className="primary-button">{busy?'Menyimpan…':'Simpan profil'}</button></form>
 </section></div>;
}
