import {
  databases,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  Query,
  type RoomDocument,
  type MessageDocument,
  type SignalingDocument
} from './appwrite';

/**
 * Deletes all messages associated with a room.
 * Batches deletion in chunks of 100 until all documents are removed.
 */
export async function deleteRoomMessages(roomId: string): Promise<number> {
  if (!roomId) return 0;
  let totalDeleted = 0;

  try {
    while (true) {
      const res = await databases.listDocuments<MessageDocument>(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [Query.equal('roomId', roomId), Query.limit(100)]
      );

      if (!res.documents || res.documents.length === 0) {
        break;
      }

      const deletePromises = res.documents.map((doc) =>
        databases
          .deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.MESSAGES, doc.$id)
          .catch((err) => {
            // Ignore 404 (document already deleted)
            if (err?.code !== 404) {
              console.warn(`Failed to delete message ${doc.$id}:`, err);
            }
          })
      );

      await Promise.all(deletePromises);
      totalDeleted += res.documents.length;

      // If fewer than limit was returned, we have reached the end
      if (res.documents.length < 100) {
        break;
      }
    }
  } catch (err) {
    console.warn(`Error during message cleanup for room ${roomId}:`, err);
  }

  return totalDeleted;
}

/**
 * Deletes all signaling documents associated with a room.
 * Batches deletion in chunks of 100 until all documents are removed.
 */
export async function deleteRoomSignaling(roomId: string): Promise<number> {
  if (!roomId) return 0;
  let totalDeleted = 0;

  try {
    while (true) {
      const res = await databases.listDocuments<SignalingDocument>(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SIGNALING,
        [Query.equal('roomId', roomId), Query.limit(100)]
      );

      if (!res.documents || res.documents.length === 0) {
        break;
      }

      const deletePromises = res.documents.map((doc) =>
        databases
          .deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.SIGNALING, doc.$id)
          .catch((err) => {
            if (err?.code !== 404) {
              console.warn(`Failed to delete signaling ${doc.$id}:`, err);
            }
          })
      );

      await Promise.all(deletePromises);
      totalDeleted += res.documents.length;

      if (res.documents.length < 100) {
        break;
      }
    }
  } catch (err) {
    console.warn(`Error during signaling cleanup for room ${roomId}:`, err);
  }

  return totalDeleted;
}

/**
 * Purges all transient data for a room (messages and signaling records).
 */
export async function deleteRoomData(roomId: string): Promise<{ deletedMessages: number; deletedSignals: number }> {
  const [deletedMessages, deletedSignals] = await Promise.all([
    deleteRoomMessages(roomId),
    deleteRoomSignaling(roomId)
  ]);
  return { deletedMessages, deletedSignals };
}

/**
 * Completely purges a room and all its child data (messages, signaling, and room document).
 */
export async function deleteRoomCompletely(roomId: string): Promise<boolean> {
  if (!roomId) return false;
  try {
    await deleteRoomData(roomId);
    await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId).catch((err) => {
      if (err?.code !== 404) {
        console.warn(`Failed to delete room document ${roomId}:`, err);
      }
    });
    return true;
  } catch (err) {
    console.warn(`Failed to completely delete room ${roomId}:`, err);
    return false;
  }
}

/**
 * Schedules an empty non-permanent room to expire in a given number of hours (default 3).
 * Also authoritatively sets participantCount to 0.
 */
export async function scheduleRoomExpiration(roomId: string, hours = 3): Promise<void> {
  if (!roomId) return;
  try {
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    await databases.updateDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomId, {
      participantCount: 0,
      expiresAt
    });
  } catch (err) {
    console.warn(`Failed to schedule expiration for room ${roomId}:`, err);
  }
}

/**
 * Sweeper routine: finds non-permanent rooms whose expiration timestamp has passed,
 * and deletes them along with all their messages and signaling data.
 */
export async function sweepExpiredRooms(): Promise<{ expiredRooms: number; deletedMessages: number; deletedSignals: number }> {
  let expiredRooms = 0;
  let totalMessages = 0;
  let totalSignals = 0;

  try {
    const nowIso = new Date().toISOString();
    // Query rooms where expiresAt is non-empty and before now
    const res = await databases.listDocuments<RoomDocument>(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.ROOMS,
      [
        Query.equal('isPermanent', false),
        Query.lessThan('expiresAt', nowIso),
        Query.limit(50)
      ]
    );

    if (res.documents && res.documents.length > 0) {
      for (const roomDoc of res.documents) {
        // Double check expiration timestamp
        if (roomDoc.expiresAt && new Date(roomDoc.expiresAt).getTime() <= Date.now()) {
          const stats = await deleteRoomData(roomDoc.$id);
          totalMessages += stats.deletedMessages;
          totalSignals += stats.deletedSignals;

          await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, roomDoc.$id).catch(() => {});
          expiredRooms++;
        }
      }
    }
  } catch (err) {
    // If the index is still building or query fails, log quietly without breaking UI
    console.warn('Expired room sweeper encountered an issue:', err);
  }

  return { expiredRooms, deletedMessages: totalMessages, deletedSignals: totalSignals };
}
