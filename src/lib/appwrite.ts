import { Client, Account, Databases, ID, Query, Permission, Role, Models } from 'appwrite';
import type { RealtimeResponseEvent } from 'appwrite';
export type { RealtimeResponseEvent };

export const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69e76bf4000773ccd6e1';
export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'syncine_db';
export const MAX_PARTICIPANTS = Number(import.meta.env.VITE_MAX_PARTICIPANTS) || 4;

export const COLLECTIONS = {
  ROOMS: 'rooms',
  SIGNALING: 'signaling',
  MESSAGES: 'messages',
} as const;

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const realtime = {
  subscribe: <T = any>(
    channels: string | string[],
    callback: (response: RealtimeResponseEvent<T>) => void
  ) => {
    return client.subscribe(channels, callback);
  }
};

export interface RoomDocument extends Models.Document {
  name: string;
  hostId: string;
  syncState?: string;
  mediaMode: 'screen' | 'local_file';
  participantCount?: number;
  maxParticipants?: number;
  isPermanent?: boolean;
  expiresAt?: string;
}

export interface SignalingDocument extends Models.Document {
  roomId: string;
  senderId: string;
  receiverId: string;
  type: 'offer' | 'answer' | 'candidate';
  payload: string;
}

export interface MessageDocument extends Models.Document {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
}

/**
 * Ensures an active session exists.
 * Returns existing user session if active; otherwise generates an anonymous guest session.
 */
export async function ensureAnonymousSession(): Promise<Models.User<Models.Preferences>> {
  try {
    return await account.get();
  } catch {
    try {
      await account.createAnonymousSession();
      return await account.get();
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  }
}

/**
 * Optional Appwrite Auth: Sign in with email and password
 */
export async function loginWithEmail(email: string, pass: string): Promise<Models.User<Models.Preferences>> {
  try {
    // Delete any active anonymous session first to prevent session collision
    try {
      await account.deleteSession('current');
    } catch {
      // Ignore if no session
    }
    await account.createEmailPasswordSession(email, pass);
    return await account.get();
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
}

/**
 * Optional Appwrite Auth: Create new account with email
 */
export async function registerWithEmail(email: string, pass: string, name: string): Promise<Models.User<Models.Preferences>> {
  try {
    try {
      await account.deleteSession('current');
    } catch {
      // Ignore
    }
    await account.create(ID.unique(), email, pass, name);
    await account.createEmailPasswordSession(email, pass);
    return await account.get();
  } catch (err) {
    console.error('Registration error:', err);
    throw err;
  }
}

/**
 * Sign out and reset back to anonymous guest session
 */
export async function logoutUser(): Promise<Models.User<Models.Preferences>> {
  try {
    await account.deleteSession('current');
  } catch {
    // Ignore
  }
  return await ensureAnonymousSession();
}

/**
 * Check if current user is authenticated with email (not an anonymous guest)
 */
export function isUserRegistered(user: Models.User<Models.Preferences> | null): boolean {
  if (!user) return false;
  return Boolean(user.email && user.email.length > 0 && !user.name?.startsWith('Guest '));
}

export { ID, Query, Permission, Role };
