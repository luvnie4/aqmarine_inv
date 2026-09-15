import { supabase } from './supabase';
import type { UserAccount } from '../types';

export async function login(email: string, password: string, remember: boolean) {
  if (!remember) sessionStorage.setItem('aqmarine_session_only', '1');
  else sessionStorage.removeItem('aqmarine_session_only');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
export async function logout() { const { error } = await supabase.auth.signOut(); if (error) throw error; }

async function profileFor(email: string): Promise<UserAccount | null> {
  const { data, error } = await supabase.from('staff_profiles').select('id,username,name,email,role,role_label,outlet_id,outlet_name,active').eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!data || data.active === false || !['owner','superadmin','admin','gudang','kasir'].includes(data.role)) return null;
  return { id:data.id, username:data.username || data.email, name:data.name || data.email, email:data.email, role:data.role, roleLabel:data.role_label || data.role, outletId:data.outlet_id || undefined, outletName:data.outlet_name || undefined } as UserAccount;
}

export function observeAccount(callback: (user: UserAccount | null, error?: string) => void) {
  let generation = 0;
  const resolve = async (email?: string | null) => {
    const request = ++generation;
    if (!email) { callback(null); return; }
    try {
      const profile = await profileFor(email);
      if (request !== generation) return;
      if (!profile) { callback(null, 'Akun belum memiliki akses. Hubungi pemilik toko.'); await supabase.auth.signOut(); return; }
      callback(profile);
    } catch { if (request === generation) callback(null, 'Akses akun belum dapat diverifikasi. Periksa koneksi dan coba masuk kembali.'); }
  };
  void supabase.auth.getSession().then(({ data }) => resolve(data.session?.user.email));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => { void resolve(session?.user.email); });
  return () => { generation++; data.subscription.unsubscribe(); };
}
