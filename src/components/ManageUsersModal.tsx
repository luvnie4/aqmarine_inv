import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCog, 
  Crown, 
  ShieldCheck, 
  Store, 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Mail, 
  AlertCircle,
  Sparkles,
  Search,
  Download,
  KeyRound
} from 'lucide-react';
import { UserAccount, UserRole, StoreOutlet } from '../types';
import { StoredUser, DEFAULT_USERS } from '../data/authData';
import { getUsers, saveUsers, updateUser, addUser, deleteUser, resetUsersToDefault } from '../utils/userStorage';
import { getOutlets } from '../utils/outletStorage';

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onCurrentUserUpdated?: (user: UserAccount) => void;
  onUsersUpdated?: () => void;
}

export const ManageUsersModal: React.FC<ManageUsersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCurrentUserUpdated,
  onUsersUpdated,
}) => {
  const isSuperAdmin = currentUser?.role === 'owner';

  const [users, setUsers] = useState<StoredUser[]>([]);
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state for Add/Edit
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('admin');
  const [formRoleLabel, setFormRoleLabel] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formOutletName, setFormOutletName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Notifications & Inline Confirmations
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  const loadData = () => {
    const allUsers = getUsers();
    setUsers(allUsers);
    const allOutlets = getOutlets();
    setOutlets(allOutlets);

    // If current user is a standard admin (not superadmin), automatically load their own profile into the form
    if (!isSuperAdmin && currentUser) {
      const myUser = allUsers.find(
        (u) => u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()
      ) || {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        passwordHash: currentUser.passwordHash || '',
        role: currentUser.role,
        roleLabel: currentUser.roleLabel,
        email: currentUser.email,
        outletName: currentUser.outletName,
      };

      setEditingUserId(myUser.id);
      setIsAddingNew(false);
      setFormName(myUser.name);
      setFormUsername(myUser.username);
      setFormPassword(myUser.passwordHash);
      setFormRole(myUser.role);
      setFormRoleLabel(myUser.roleLabel || 'Admin Toko & Input Penjualan');
      setFormEmail(myUser.email || '');
      setFormOutletName(myUser.outletName || (allOutlets[0]?.name || ''));
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (isSuperAdmin) {
        setIsAddingNew(false);
        setEditingUserId(null);
      }
      setDeletingUserId(null);
      setIsResetConfirming(false);
      setErrorMessage(null);
      setToastMessage(null);
      setSearchQuery('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getRoleDefaultLabel = (role: UserRole): string => {
    switch (role) {
      case 'owner':
        return 'Super Admin & Owner';
      case 'admin':
        return 'Admin Toko & Input Penjualan';
      default:
        return 'Admin AQMARINE';
    }
  };

  const handleStartAdd = () => {
    if (!isSuperAdmin) return;
    setEditingUserId(null);
    setIsAddingNew(true);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('admin');
    setFormRoleLabel('Admin Toko & Input Penjualan');
    setFormEmail('');
    setFormOutletName(outlets[0]?.name || 'Aqmarine Flagship Butik');
    setShowPassword(false);
    setErrorMessage(null);
    setDeletingUserId(null);
  };

  const handleStartEdit = (user: StoredUser) => {
    // Only Superadmin can edit other users
    if (!isSuperAdmin && user.id !== currentUser?.id && user.username !== currentUser?.username) {
      setErrorMessage('Admin hanya berhak mengelola data akun sendiri.');
      return;
    }

    setIsAddingNew(false);
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormPassword(user.passwordHash);
    setFormRole(user.role);
    setFormRoleLabel(user.roleLabel || getRoleDefaultLabel(user.role));
    setFormEmail(user.email || '');
    setFormOutletName(user.outletName || (outlets[0]?.name || ''));
    setShowPassword(false);
    setErrorMessage(null);
    setDeletingUserId(null);
  };

  const handleCancelForm = () => {
    if (isSuperAdmin) {
      setIsAddingNew(false);
      setEditingUserId(null);
    }
    setErrorMessage(null);
  };

  const handleRoleChange = (role: UserRole) => {
    if (!isSuperAdmin) return; // Non-superadmin cannot change role
    setFormRole(role);
    setFormRoleLabel(getRoleDefaultLabel(role));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = formName.trim();
    const trimmedUsername = formUsername.trim().toLowerCase();
    const trimmedPassword = formPassword.trim();

    if (!trimmedName) {
      setErrorMessage('Nama lengkap pengguna wajib diisi.');
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Username login wajib diisi.');
      return;
    }

    if (trimmedUsername.length < 3) {
      setErrorMessage('Username minimal harus 3 karakter.');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Kata sandi (password) akun wajib diisi.');
      return;
    }

    // Check username uniqueness
    const currentUsers = getUsers();
    const targetUserId = editingUserId || currentUser?.id;
    const isDuplicate = currentUsers.some(
      (u) => u.username.toLowerCase() === trimmedUsername && u.id !== targetUserId
    );

    if (isDuplicate) {
      setErrorMessage(`Username "${trimmedUsername}" sudah digunakan oleh akun lain. Silakan pilih username unik lain.`);
      return;
    }

    // Enforce role protection for non-superadmin
    const effectiveRole: UserRole = isSuperAdmin ? formRole : 'admin';
    const effectiveRoleLabel: string = isSuperAdmin 
      ? (formRoleLabel.trim() || getRoleDefaultLabel(formRole))
      : (currentUser?.roleLabel || 'Admin Toko & Input Penjualan');

    if (isAddingNew && isSuperAdmin) {
      // Create new user (Super Admin only)
      const updated = addUser({
        name: trimmedName,
        username: trimmedUsername,
        passwordHash: trimmedPassword,
        role: effectiveRole,
        roleLabel: effectiveRoleLabel,
        email: formEmail.trim() || undefined,
        outletName: formOutletName.trim() || undefined,
      });

      setUsers(updated);
      setIsAddingNew(false);
      showToast(`Pengguna baru "${trimmedName}" berhasil ditambahkan.`);
      if (onUsersUpdated) onUsersUpdated();
    } else if (targetUserId) {
      // Update user
      const updated = updateUser(targetUserId, {
        name: trimmedName,
        username: trimmedUsername,
        passwordHash: trimmedPassword,
        role: effectiveRole,
        roleLabel: effectiveRoleLabel,
        email: formEmail.trim() || undefined,
        outletName: formOutletName.trim() || undefined,
      });

      setUsers(updated);

      // If user edited their own logged-in account, sync active currentUser
      if (currentUser && (currentUser.id === targetUserId || currentUser.username.toLowerCase() === trimmedUsername)) {
        const updatedCurrentUser: UserAccount = {
          ...currentUser,
          id: targetUserId,
          name: trimmedName,
          username: trimmedUsername,
          passwordHash: trimmedPassword,
          role: effectiveRole,
          roleLabel: effectiveRoleLabel,
          email: formEmail.trim() || undefined,
          outletName: formOutletName.trim() || undefined,
        };
        if (onCurrentUserUpdated) {
          onCurrentUserUpdated(updatedCurrentUser);
        }
      }

      if (isSuperAdmin) {
        setEditingUserId(null);
      }
      showToast(`Data akun "${trimmedName}" berhasil diperbarui & disinkronkan.`);
      if (onUsersUpdated) onUsersUpdated();
    }
  };

  const confirmDeleteUser = (user: StoredUser) => {
    if (!isSuperAdmin) {
      setErrorMessage('Hanya Super Admin yang memiliki wewenang untuk menghapus akun.');
      return;
    }

    // Safety 1: Cannot delete logged in user
    if (currentUser && (currentUser.id === user.id || currentUser.username === user.username)) {
      setErrorMessage('Anda tidak dapat menghapus akun yang sedang Anda gunakan untuk login saat ini.');
      setDeletingUserId(null);
      return;
    }

    // Safety 2: Must maintain at least 1 owner or admin
    const currentUsers = getUsers();
    const adminCount = currentUsers.filter((u) => u.role === 'owner' || u.role === 'admin').length;
    if ((user.role === 'owner' || user.role === 'admin') && adminCount <= 1) {
      setErrorMessage('Tidak dapat menghapus. Sistem wajib memiliki minimal 1 akun Super Admin / Owner.');
      setDeletingUserId(null);
      return;
    }

    const updated = deleteUser(user.id);
    setUsers(updated);
    setDeletingUserId(null);
    showToast(`Akun "${user.name}" (@${user.username}) berhasil dihapus.`);
    if (onUsersUpdated) onUsersUpdated();
  };

  const confirmResetUsers = () => {
    if (!isSuperAdmin) return;
    const defaults = resetUsersToDefault();
    setUsers(defaults);
    setIsResetConfirming(false);
    showToast('Daftar akun pengguna berhasil dikembalikan ke bawaan awal.');
    if (onUsersUpdated) onUsersUpdated();
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.roleLabel && u.roleLabel.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const handleExportUsersCSV = () => {
    if (!isSuperAdmin || users.length === 0) return;
    const headers = ['ID', 'Nama Lengkap', 'Username', 'Role', 'Label Jabatan', 'Email', 'Outlet Penempatan'];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.username.replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${(u.roleLabel || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.outletName || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Pengguna_AQMARINE_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data akun pengguna berhasil di-export ke CSV.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header Modal */}
        <div className={`p-5 sm:p-6 text-white flex items-center justify-between ${
          isSuperAdmin 
            ? 'bg-gradient-to-r from-[#9E6B70] via-[#8C5559] to-[#78464A]' 
            : 'bg-gradient-to-r from-slate-800 via-slate-700 to-[#9E6B70]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
              {isSuperAdmin ? (
                <UserCog className="w-6 h-6 text-white" />
              ) : (
                <KeyRound className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isSuperAdmin ? 'Kelola Data Semua Pengguna' : 'Pengaturan Akun Pengguna'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                  isSuperAdmin ? 'bg-amber-400 text-amber-950' : 'bg-rose-200 text-rose-950'
                }`}>
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">
                {isSuperAdmin 
                  ? 'Kelola hak akses semua user, tambah akun baru, ganti kata sandi & peranan.' 
                  : 'Kelola data profil, nama staf, username, dan kata sandi akun Anda sendiri.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Reset Confirmation Banner (Superadmin only) */}
          {isSuperAdmin && isResetConfirming && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in">
              <p className="text-xs font-bold text-amber-900">
                Kembalikan semua daftar akun staf ke konfigurasi awal bawaan?
              </p>
              <p className="text-[11px] text-amber-800">
                Akun Super Admin dan Admin akan dikembalikan ke username dan kata sandi standar bawaan (myquartin & admin123).
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={confirmResetUsers}
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

          {/* User Form: Rendered directly for Admin (self-management) or when triggered by Superadmin */}
          {(!isSuperAdmin || isAddingNew || editingUserId) ? (
            <div className={`p-4 sm:p-5 rounded-2xl space-y-4 border ${
              isSuperAdmin ? 'bg-slate-50 border-2 border-[#9E6B70]/30' : 'bg-slate-50/70 border-slate-200'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#9E6B70]/15 text-[#8C5559] rounded-lg">
                    {isAddingNew ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isSuperAdmin
                      ? (isAddingNew ? 'Tambah Pengguna / Staf Baru' : 'Edit Data Pengguna & Kata Sandi')
                      : 'Edit Data Profil & Kata Sandi Akun Anda'}
                  </h4>
                </div>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Lengkap Staf / Pengguna <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Contoh: Siti Aisyah"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Username Login <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Contoh: aisyah"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password Field with toggle */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kata Sandi (Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Masukkan kata sandi baru..."
                        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Email (Optional) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email Akun (Opsional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="aisyah@aqmarine.id"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Outlet Assignment */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Outlet / Lokasi Penempatan
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    {outlets.length > 0 ? (
                      <select
                        value={formOutletName}
                        onChange={(e) => setFormOutletName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                      >
                        {outlets.map((outlet) => (
                          <option key={outlet.id} value={outlet.name}>
                            {outlet.name} {outlet.code ? `(${outlet.code})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formOutletName}
                        onChange={(e) => setFormOutletName(e.target.value)}
                        placeholder="Contoh: Butik Utama Bandung"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                      />
                    )}
                  </div>
                </div>

                {/* Role Selection (Superadmin only) */}
                {isSuperAdmin ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Peranan & Hak Akses (Role)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRoleChange('owner')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          formRole === 'owner'
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                          <Crown className="w-4 h-4 text-amber-600" />
                          <span>Super Admin (Owner)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Akses penuh sistem, kelola semua user & data</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRoleChange('admin')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          formRole === 'admin'
                            ? 'bg-rose-50 border-[#9E6B70] ring-2 ring-[#9E6B70]/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[#8C5559] font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-[#9E6B70]" />
                          <span>Admin Toko</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Input penjualan, mutasi stok, stok opname & katalog</p>
                      </button>
                    </div>

                    {/* Role Custom Title */}
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Label Jabatan di Tampilan
                      </label>
                      <input
                        type="text"
                        value={formRoleLabel}
                        onChange={(e) => setFormRoleLabel(e.target.value)}
                        placeholder={getRoleDefaultLabel(formRole)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                      />
                    </div>
                  </div>
                ) : (
                  /* Readonly Role Indicator for Admin */
                  <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#9E6B70]" />
                      <div>
                        <span className="text-xs font-bold text-slate-800">Hak Akses: Admin Toko</span>
                        <p className="text-[10px] text-slate-500">Peranan akun hanya dapat diubah oleh Super Admin / Owner</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                      {currentUser?.roleLabel || 'Admin'}
                    </span>
                  </div>
                )}

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#9E6B70] hover:bg-[#8C5559] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {isSuperAdmin
                        ? (isAddingNew ? 'Simpan Pengguna Baru' : 'Perbarui Akun')
                        : 'Simpan Perubahan Akun Saya'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Action Bar: Add User & Search (Super Admin Only) */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama staf, username, atau role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E6B70]/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportUsersCSV}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                  title="Export data pengguna ke file CSV / Excel"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3.5 py-2 bg-[#9E6B70] hover:bg-[#8C5559] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Users - Visible ONLY to Super Admin */}
          {isSuperAdmin && !isAddingNew && !editingUserId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <span>Daftar Akun Pengguna ({filteredUsers.length})</span>
                <span className="text-[11px] font-normal">Super Admin dapat mengubah semua kredensial akun</span>
              </div>

              <div className="border border-slate-200/80 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-xs">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Tidak ada data pengguna yang cocok dengan pencarian.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isCurrentSessionUser = currentUser?.id === user.id || currentUser?.username === user.username;

                    return (
                      <div
                        key={user.id}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isCurrentSessionUser ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Left: User info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                            user.role === 'owner'
                              ? 'bg-amber-500 text-white'
                              : 'bg-[#9E6B70] text-white'
                          }`}>
                            {user.role === 'owner' ? (
                              <Crown className="w-5 h-5 text-amber-100" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-rose-100" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {user.name}
                              </span>
                              {isCurrentSessionUser && (
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                                  Akun Anda (Aktif)
                                </span>
                              )}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${
                                user.role === 'owner'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {user.roleLabel || user.role}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap font-mono">
                              <span>Username: <strong className="text-slate-800">{user.username}</strong></span>
                              <span>•</span>
                              <span>Pass: <strong className="text-slate-800">{user.passwordHash}</strong></span>
                              {user.outletName && (
                                <>
                                  <span>•</span>
                                  <span className="font-sans text-slate-600">Butik: {user.outletName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {deletingUserId === user.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <span className="text-[11px] font-bold text-rose-700 mr-1 hidden sm:inline">
                                Hapus akun ini?
                              </span>
                              <button
                                type="button"
                                onClick={() => confirmDeleteUser(user)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingUserId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(user)}
                                className="px-2.5 py-1.5 text-slate-600 hover:text-[#9E6B70] hover:bg-rose-50 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#9E6B70]" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                disabled={isCurrentSessionUser}
                                onClick={() => setDeletingUserId(user.id)}
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  isCurrentSessionUser
                                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 cursor-pointer'
                                }`}
                                title={isCurrentSessionUser ? 'Tidak dapat menghapus akun yang sedang aktif' : 'Hapus Akun'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => setIsResetConfirming(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Kembalikan Akun Bawaan</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data akun Anda tersinkronisasi otomatis ke Cloud Firestore</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
