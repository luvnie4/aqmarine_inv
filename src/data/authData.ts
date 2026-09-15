import type { UserAccount } from '../types';
export type StoredUser = UserAccount;
export const DEFAULT_USERS: StoredUser[] = [];
export const AUTH_STORAGE_KEYS = { CURRENT_USER: 'aqmarine_auth_current_user_v1', REMEMBER_ME: 'aqmarine_auth_remember_me_v1', CUSTOM_USERS: 'aqmarine_auth_users_v1' };
