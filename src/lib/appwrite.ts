import { Client, Account, Databases, ID, Query, Permission, Role, Models } from 'appwrite';
import type { RealtimeResponseEvent } from 'appwrite';
export type { RealtimeResponseEvent };

export const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '6a97c0ed000188adaed0';
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
 * Ensures an active anonymous session exists.
 * Reuses existing session if available; creates a new anonymous session otherwise.
 */
export async function ensureAnonymousSession(): Promise<Models.User<Models.Preferences>> {
  try {
    return await account.get();
  } catch {
    try {
      await account.createAnonymousSession();
      return await account.get();
    } catch (err) {
      console.error('Failed to create anonymous session:', err);
      throw err;
    }
  }
}

export { ID, Query, Permission, Role };
