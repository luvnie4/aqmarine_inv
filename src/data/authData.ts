import { UserAccount } from '../types';

export interface StoredUser extends UserAccount {
  passwordHash: string; // Stored password for verification
}

export const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'usr-0',
    username: 'ceo_owner',
    passwordHash: 'myquartin',
    name: 'Owner AQMARINE',
    role: 'owner',
    roleLabel: 'Super Admin & Owner',
    email: 'owner@aqmarine.id',
  },
  {
    id: 'usr-admin',
    username: 'admin',
    passwordHash: 'admin123',
    name: 'Admin AQMARINE',
    role: 'admin',
    roleLabel: 'Admin Toko & Input Penjualan',
    email: 'admin@aqmarine.id',
  },
];

export const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'aqmarine_auth_current_user_v1',
  REMEMBER_ME: 'aqmarine_auth_remember_me_v1',
  CUSTOM_USERS: 'aqmarine_auth_users_v1',
};
