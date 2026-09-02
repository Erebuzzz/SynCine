import { Client, Databases, Query } from 'node-appwrite';

/**
 * Appwrite Serverless Function: cleanup-stale-signals
 * Cron Schedule: *\/5 * * * * (Every 5 minutes)
 * Purges signaling documents created more than 10 minutes ago.
 */
export default async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'syncine_db';

  if (!projectId || !apiKey) {
    error('Missing required environment variables: APPWRITE_PROJECT_ID or APPWRITE_API_KEY.');
    return res.json({ success: false, error: 'Function environment misconfigured' }, 500);
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const db = new Databases(client);
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  try {
    const expiredSignals = await db.listDocuments(
      databaseId,
      'signaling',
      [
        Query.lessThan('$createdAt', cutoff),
        Query.limit(100)
      ]
    );

    let deletedCount = 0;
    for (const doc of expiredSignals.documents) {
      await db.deleteDocument(databaseId, 'signaling', doc.$id);
      deletedCount++;
    }

    log(`Successfully purged ${deletedCount} expired signaling documents.`);
    return res.json({ success: true, count: deletedCount, cutoff });
  } catch (err) {
    error(`Failed to purge stale signals: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
