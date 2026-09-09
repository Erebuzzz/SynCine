import { Client, Account, Databases, ID, Query, Permission, Role, Models } from 'appwrite';
import type { RealtimeResponseEvent } from 'appwrite';
export type { RealtimeResponseEvent };

export const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
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
  mediaMode: 'screen' | 'local_file' | 'youtube';
  participantCount?: number;
  maxParticipants?: number;
  isPermanent?: boolean;
  expiresAt?: string;
  isLocked?: boolean;
  youtubeVideoId?: string;
  youtubeUrl?: string;
}

export interface SignalingDocument extends Models.Document {
  roomId: string;
  senderId: string;
  receiverId: string;
  type: 'offer' | 'answer' | 'candidate' | 'knock' | 'knock-admitted' | 'knock-declined';
  payload: string;
}

/**
 * Normalizes a room document to handle both native Appwrite schemas and
 * resilient fallback schemas where YouTube metadata or lock status are encoded in syncState.
 */
export function normalizeRoomDocument(doc: RoomDocument): RoomDocument {
  if (!doc) return doc;
  const normalized: RoomDocument = { ...doc };
  if (normalized.syncState) {
    try {
      const parsed = typeof normalized.syncState === 'string'
        ? JSON.parse(normalized.syncState)
        : normalized.syncState;
      if (parsed && (parsed.mode === 'youtube' || parsed.youtubeVideoId)) {
        normalized.mediaMode = 'youtube';
        if (!normalized.youtubeVideoId && parsed.youtubeVideoId) {
          normalized.youtubeVideoId = parsed.youtubeVideoId;
        }
        if (!normalized.youtubeUrl && parsed.youtubeUrl) {
          normalized.youtubeUrl = parsed.youtubeUrl;
        }
      }
      if (parsed && parsed.isLocked !== undefined && normalized.isLocked === undefined) {
        normalized.isLocked = Boolean(parsed.isLocked);
      }
    } catch {
      // Regular playback sync packets or unparseable strings
    }
  }
  return normalized;
}

/**
 * Parses a YouTube URL or video ID into an 11-character video ID.
 * Supports standard watch, shortened youtu.be, embed, live, and direct ID.
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/(?:embed|live|shorts|v)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];
  return null;
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

/**
 * Generates a memorable 9-character room code.
 * Uses lowercase letters and numbers, excluding easily confused characters (0/O, 1/l/I).
 * Starts with a letter to satisfy standard ID conventions.
 */
export function generateRoomCode(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let code = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    code += letters[bytes[0] % letters.length];
    for (let i = 1; i < 9; i++) {
      code += chars[bytes[i] % chars.length];
    }
  } else {
    code += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 1; i < 9; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return code;
}

/**
 * Formats a 9-character room code as xxx-xxx-xxx for human readability.
 */
export function formatRoomCode(code: string): string {
  if (code.length === 9 && !code.includes('-')) {
    return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`;
  }
  return code;
}

/**
 * Normalizes user input room codes or links into a clean room ID.
 * Handles full URLs, query strings, hyphens, and whitespace.
 */
export function normalizeRoomCode(input: string): string {
  let cleaned = input.trim();
  if (cleaned.includes('?room=')) {
    cleaned = cleaned.split('?room=')[1].split('&')[0];
  } else if (cleaned.includes('/')) {
    // URL without ?room= query param (e.g. pathname)
    const segments = cleaned.split('/').filter(Boolean);
    if (segments.length > 0) {
      cleaned = segments[segments.length - 1];
    }
  }

  // If user entered a 9-character code with hyphens or spaces (e.g. "abc-def-ghi" or "abc def ghi")
  const stripped = cleaned.replace(/[-\s]/g, '').toLowerCase();
  if (stripped.length === 9) {
    return stripped;
  }
  return cleaned;
}

export { ID, Query, Permission, Role };
