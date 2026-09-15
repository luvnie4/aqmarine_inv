import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, LockKeyhole } from './UiIcons';
import { BrandLogo } from './BrandLogo';
import { login } from '../lib/auth';
export function LoginView({ error: accountError }: { error?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await login(email, password, remember); }
    catch { setError('Tidak dapat masuk. Periksa email, kata sandi, dan koneksi Anda.'); }
    finally { setBusy(false); }
  }
  return <main className="login-layout">
    <section className="login-brand"><BrandLogo size="lg" textColor="text-white" />
      <div><span className="eyebrow">RUANG KERJA AQMARINE</span><h1>Setiap detail,<br />tertata dengan baik.</h1><p>Kelola koleksi, stok, dan penjualan butik dalam satu tempat.</p></div>
      <span className="login-brand-footer">HIJAB & MUKENA · AQMARINE</span>
    </section>
    <section className="login-form-wrap"><form onSubmit={submit} className="login-form">
      <div className="login-lock"><LockKeyhole size={24} /></div><p className="eyebrow">SELAMAT DATANG KEMBALI</p><h2>Masuk ke butik Anda</h2><p className="muted">Gunakan akun staf yang telah terdaftar.</p>
      {(error || accountError) && <p role="alert" className="app-alert">{error || accountError}</p>}
      <label htmlFor="email">Email staf</label><input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@butik.com" required />
      <label htmlFor="password">Kata sandi</label><div className="password-field"><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
      <label className="remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Ingat saya di perangkat ini</label>
      <button className="primary-button" disabled={busy}>{busy ? 'Memverifikasi…' : 'Masuk'}<ArrowRight size={18} /></button>
      <p className="login-help">Belum memiliki akses? Hubungi pemilik toko.</p><p className="app-credits">Uicons by <a href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer">Flaticon</a></p>
    </form></section>
  </main>;
}
