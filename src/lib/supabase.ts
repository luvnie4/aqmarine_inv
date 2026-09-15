import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL || 'https://yxsauhjoqpfygmysjksx.supabase.co';
const supabaseKey = runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_PERUKfLAOGdxgva3MegKyw_hoBbqWY4';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const COLLECTIONS = {
  PRODUCTS: 'products', TRANSACTIONS: 'transactions', TRANSFERS: 'transfers',
  ADJUSTMENTS: 'adjustments', RESTOCKS: 'restocks', OUTLETS: 'outlets',
  CHANNELS: 'salesChannels', BAZAARS: 'bazaars', SUBCATEGORIES: 'subCategories',
} as const;

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const signalFailure = (error: unknown): never => {
  console.error('Supabase operation failed:', error);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aqmarine:save-error'));
  throw error;
};

export async function fetchDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const { data, error } = await supabase.from('app_documents').select('data').eq('collection_name', collectionName).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? ({ ...(data.data as object), id } as T) : null;
}

export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const { data, error } = await supabase.from('app_documents').select('id,data').eq('collection_name', collectionName);
  if (error) throw error;
  return (data || []).map(row => ({ ...(row.data as object), id: row.id } as T));
}

export async function saveDocument<T extends { id: string }>(collectionName: string, item: T) {
  const { error } = await supabase.rpc('save_aqmarine_document', { p_collection: collectionName, p_id: item.id, p_data: clean(item) });
  if (error) signalFailure(error);
  return true;
}

export async function upsertDocuments<T extends { id: string }>(collectionName: string, items: T[]) {
  if (items.length > 400) throw new Error('Maksimal 400 dokumen per impor. Bagi berkas menjadi beberapa bagian.');
  try { for (const item of items) await saveDocument(collectionName, item); return true; }
  catch (error) { return signalFailure(error); }
}

export async function deleteDocument(collectionName: string, id: string) {
  const { error } = await supabase.rpc('delete_aqmarine_document', { p_collection: collectionName, p_id: id });
  if (error) signalFailure(error);
  return true;
}

export async function fetchStaffProfiles<T>(): Promise<T[]> {
  const { data, error } = await supabase.from('staff_profiles').select('id,username,name,email,role,role_label,outlet_id,outlet_name,active').order('name');
  if (error) throw error;
  return (data || []).map(row => ({ id:row.id, username:row.username, name:row.name, email:row.email, role:row.role, roleLabel:row.role_label, outletId:row.outlet_id || undefined, outletName:row.outlet_name || undefined } as T));
}

export async function saveStaffProfile(profile: { id:string; username:string; name:string; email?:string; role:string; roleLabel?:string; outletId?:string; outletName?:string }) {
  const { error } = await supabase.from('staff_profiles').upsert({ id:profile.id, username:profile.username, name:profile.name, email:(profile.email || '').toLowerCase(), role:profile.role, role_label:profile.roleLabel || profile.role, outlet_id:profile.outletId || null, outlet_name:profile.outletName || null, active:true });
  if (error) signalFailure(error);
}

export async function deleteStaffProfile(id: string) {
  const { error } = await supabase.from('staff_profiles').delete().eq('id', id);
  if (error) signalFailure(error);
}

export type AtomicWrite = { collection: string; id: string; expected: unknown | null; data?: unknown; delete?: boolean };
export async function commitDocumentsAtomically(writes: AtomicWrite[]) {
  const { error } = await supabase.rpc('commit_aqmarine_documents', { p_writes: clean(writes) });
  if (error) signalFailure(error);
}

export function subscribeCollection<T>(collectionName: string, apply: (items: T[]) => void, fail: (error: unknown) => void) {
  let stopped = false;
  const refresh = async () => {
    try { const items = await fetchCollection<T>(collectionName); if (!stopped) apply(items); }
    catch (error) { if (!stopped) fail(error); }
  };
  void refresh();
  const channel = supabase.channel(`aqmarine:${collectionName}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_documents', filter: `collection_name=eq.${collectionName}` }, refresh)
    .subscribe(status => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fail(new Error(status)); });
  return () => { stopped = true; void supabase.removeChannel(channel); };
}
