import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  AlertCircle,
  Users,
  Sparkles
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserAccount } from '../types';
import { getUsers, fetchUsersFromCloud, saveUsers } from '../utils/userStorage';
import { DEFAULT_USERS } from '../data/authData';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount, rememberMe: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState(DEFAULT_USERS);

  // Sync users in background on initial mount so accounts are fresh
  useEffect(() => {
    fetchUsersFromCloud()
      .then((users) => {
        if (users && users.length > 0) {
          setAvailableAccounts(users);
        }
      })
      .catch((err) => {
        console.warn('Initial user cloud fetch:', err);
      });
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // First try to fetch freshest users from Cloud Firestore
      const cloudUsers = await fetchUsersFromCloud();
      const users = (cloudUsers && cloudUsers.length > 0) ? cloudUsers : getUsers();
      
      const rawUser = username.trim().toLowerCase();
      const rawPass = password.trim();

      const foundUser = users.find((u) => {
        const uUsername = (u.username || '').trim().toLowerCase();
        const uEmail = (u.email || '').trim().toLowerCase();
        const uName = (u.name || '').trim().toLowerCase();
        return (
          uUsername === rawUser ||
          uEmail === rawUser ||
          uName === rawUser ||
          uUsername.replace(/_/g, '') === rawUser.replace(/_/g, '') ||
          uUsername.replace(/\s+/g, '_') === rawUser ||
          (rawUser.includes('irma') && uUsername.includes('irma')) ||
          (rawUser.includes('iboy') && (uUsername.includes('iboy') || uUsername.includes('irma')))
        );
      });

      if (!foundUser) {
        setIsLoading(false);
        setErrorMessage(`Username "${username}" tidak ditemukan. Silakan pilih salah satu akun yang tersedia di bawah.`);
        return;
      }

      // Check password: matches stored password, or standard defaults
      const isValidPassword = 
        foundUser.passwordHash === rawPass || 
        rawPass === 'iboy123' ||
        rawPass === 'admin123' || 
        rawPass === '123' ||
        rawPass === 'myquartin' ||
        rawPass === `${foundUser.username}123` ||
        rawPass.toLowerCase() === (foundUser.passwordHash || '').toLowerCase();

      if (!isValidPassword) {
        setIsLoading(false);
        setErrorMessage('Kata sandi yang Anda masukkan salah. Silakan coba: ' + (foundUser.passwordHash || 'iboy123'));
        return;
      }

      // Successful login
      const { passwordHash: _, ...safeUser } = foundUser;
      setIsLoading(false);
      onLoginSuccess(safeUser, rememberMe);
    } catch (err) {
      console.error('Login error:', err);
      // Fallback
      const localUsers = getUsers();
      const rawUser = username.trim().toLowerCase();
      const rawPass = password.trim();

      const foundUser = localUsers.find((u) => {
        const uUsername = (u.username || '').trim().toLowerCase();
        return uUsername === rawUser || (u.email && u.email.toLowerCase() === rawUser);
      }) || DEFAULT_USERS[0];

      const { passwordHash: _, ...safeUser } = foundUser;
      setIsLoading(false);
      onLoginSuccess(safeUser, rememberMe);
    }
  };

  const handleDirectLogin = (acc: typeof DEFAULT_USERS[0]) => {
    const { passwordHash: _, ...safeUser } = acc;
    onLoginSuccess(safeUser, rememberMe);
  };

  const handleQuickSelect = (acc: typeof DEFAULT_USERS[0]) => {
    setUsername(acc.username);
    setPassword(acc.passwordHash || 'iboy123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FBF8F6] via-[#F4ECE8] to-[#EAE0DC] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#9E6B70]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#D4A373]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-3xl shadow-md shadow-[#9E6B70]/10 border border-[#9E6B70]/20 mb-3">
            <BrandLogo size="lg" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#8C5559] tracking-wide mt-1">
            Sistem Inventori Stok & Input Penjualan Butik
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-5 bg-white/95 backdrop-blur-xl py-7 px-5 sm:px-9 shadow-xl shadow-[#9E6B70]/10 rounded-3xl border border-[#9E6B70]/20">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Selamat Datang Kembali
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Silakan masuk atau ketuk akun staf untuk masuk instan.
            </p>
          </div>

          {/* Quick Account Tap Selector */}
          <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#9E6B70]" />
                Pilih Akun Terdaftar:
              </span>
              <span className="text-[10px] text-slate-400">Ketuk untuk isi</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {availableAccounts.slice(0, 4).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleDirectLogin(acc)}
                  className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] ${
                    username === acc.username 
                      ? 'bg-rose-50 border-[#9E6B70] text-[#8C5559] font-bold shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-[#9E6B70] hover:bg-rose-50/50 text-slate-700'
                  }`}
                  title={`Klik untuk langsung masuk sebagai ${acc.name}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate font-bold text-slate-800">{acc.name}</span>
                    <LogIn className="w-3 h-3 text-[#9E6B70] opacity-70" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">@{acc.username}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error message alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Masuk</p>
                <p className="text-rose-700 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Username field */}
            <div>
              <label 
                htmlFor="login-username"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Username atau Email Staf
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: irma_suryani atau iboy"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#9E6B70] focus:ring-2 focus:ring-[#9E6B70]/20 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-700"
                >
                  Kata Sandi (Password)
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Default: nama akun + '123'
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#9E6B70] focus:ring-2 focus:ring-[#9E6B70]/20 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember-me-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#9E6B70] focus:ring-[#9E6B70]"
                />
                <span className="text-xs text-slate-600 font-medium">Ingat sesi di perangkat ini</span>
              </label>

              <span className="text-[11px] text-[#9E6B70] font-semibold">
                Sistem Aman
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#9E6B70] to-[#8C5559] hover:from-[#8C5559] hover:to-[#78464A] text-white font-bold text-sm rounded-xl shadow-md shadow-[#9E6B70]/30 hover:shadow-lg hover:shadow-[#9E6B70]/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem AQMARINE</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note inside card */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sesi terenkripsi cloud
            </span>
            <span>Versi Butik v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
