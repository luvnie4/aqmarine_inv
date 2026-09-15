import type { UserAccount } from '../types';
import { fetchStaffProfiles, saveStaffProfile } from '../lib/supabase';

export const getUsers = (): UserAccount[] => [];
export const saveUsers = async (users: UserAccount[]) => { for (const user of users) await saveStaffProfile(user); };
export const fetchUsersFromCloud = (): Promise<UserAccount[]> => fetchStaffProfiles<UserAccount>();
