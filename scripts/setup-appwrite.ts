import * as dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const dbId = process.env.APPWRITE_DATABASE_ID || 'syncine_db';

if (!projectId) {
  console.warn('APPWRITE_PROJECT_ID is not set in environment or .env file.');
  console.warn('Please define APPWRITE_PROJECT_ID before running this setup script.');
  process.exit(1);
}

if (!apiKey) {
  console.warn('APPWRITE_API_KEY is not set in environment or .env file.');
  console.warn('Provisioning script requires an admin API key with databases.write scope to execute.');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
};

async function apiRequest(path: string, method: string = 'GET', body?: any) {
  const url = `${endpoint}${path}`;
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { text };
  }

  if (!response.ok && response.status !== 409) {
    throw new Error(`API Error [${response.status}] ${data.message || response.statusText}`);
  }

  return { status: response.status, data };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootstrap() {
  console.log(`Connecting to Appwrite REST: ${endpoint} (Project: ${projectId})`);

  // 1. Create Database
  try {
    const res = await apiRequest('/databases', 'POST', {
      databaseId: dbId,
      name: 'SynCine Production Database',
      enabled: true,
    });
    if (res.status === 409) {
      console.log(`Database '${dbId}' already exists, verifying collections...`);
    } else {
      console.log(`Database '${dbId}' created successfully.`);
    }
  } catch (err: any) {
    console.error('Error creating database:', err.message);
  }

  await sleep(1000);

  // 2. Rooms Collection
  try {
    const res = await apiRequest(`/databases/${dbId}/collections`, 'POST', {
      collectionId: 'rooms',
      name: 'Rooms',
      permissions: [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")',
      ],
      documentSecurity: false,
      enabled: true,
    });
    if (res.status === 409) {
      console.log('Collection "rooms" already exists.');
    } else {
      console.log('Collection "rooms" created.');
    }
  } catch (err: any) {
    console.error('Error creating rooms collection:', err.message);
  }

  await sleep(1000);

  // Attributes for rooms
  const roomAttributes = [
    { type: 'string', key: 'name', size: 64, required: true },
    { type: 'string', key: 'hostId', size: 36, required: true },
    { type: 'string', key: 'syncState', size: 4096, required: false },
    { type: 'enum', key: 'mediaMode', elements: ['screen', 'local_file', 'youtube'], required: true },
    { type: 'integer', key: 'participantCount', required: false, min: 0, max: 4, default: 1 },
    { type: 'integer', key: 'maxParticipants', required: false, min: 1, max: 4, default: 4 },
    { type: 'boolean', key: 'isPermanent', required: false, default: false },
    { type: 'string', key: 'expiresAt', size: 64, required: false },
    { type: 'string', key: 'youtubeVideoId', size: 32, required: false },
    { type: 'string', key: 'youtubeUrl', size: 2048, required: false },
    { type: 'boolean', key: 'isLocked', required: false, default: false },
  ];

  for (const attr of roomAttributes) {
    try {
      let path = `/databases/${dbId}/collections/rooms/attributes/${attr.type}`;
      if (attr.type === 'string') {
        await apiRequest(path, 'POST', {
          key: attr.key,
          size: attr.size,
          required: attr.required,
        });
      } else if (attr.type === 'enum') {
        await apiRequest(path, 'POST', {
          key: attr.key,
          elements: (attr as any).elements,
          required: attr.required,
        });
      } else if (attr.type === 'integer') {
        await apiRequest(path, 'POST', {
          key: attr.key,
          required: attr.required,
          min: attr.min,
          max: attr.max,
          default: attr.default,
        });
      } else if (attr.type === 'boolean') {
        await apiRequest(path, 'POST', {
          key: attr.key,
          required: attr.required,
          default: attr.default,
        });
      }
      console.log(`Attribute rooms.${attr.key} created.`);
      await sleep(500);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('409')) {
        console.log(`Attribute rooms.${attr.key} already exists. Attempting update...`);
        try {
          if (attr.type === 'enum') {
            await apiRequest(`/databases/${dbId}/collections/rooms/attributes/enum/${attr.key}`, 'PATCH', {
              elements: (attr as any).elements,
              required: attr.required,
              default: 'screen',
            });
            console.log(`Attribute rooms.${attr.key} updated with new elements.`);
          } else if (attr.type === 'integer') {
            await apiRequest(`/databases/${dbId}/collections/rooms/attributes/integer/${attr.key}`, 'PATCH', {
              required: attr.required,
              min: attr.min,
              max: attr.max,
              default: attr.default,
            });
            console.log(`Attribute rooms.${attr.key} updated.`);
          }
        } catch (updateErr: any) {
          console.warn(`Attribute rooms.${attr.key} update note:`, updateErr.message);
        }
      } else {
        console.warn(`Attribute rooms.${attr.key} warning:`, err.message);
      }
    }
  }

  // 3. Signaling Collection
  try {
    const res = await apiRequest(`/databases/${dbId}/collections`, 'POST', {
      collectionId: 'signaling',
      name: 'Signaling',
      permissions: [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")',
      ],
      documentSecurity: false,
      enabled: true,
    });
    if (res.status === 409) {
      console.log('Collection "signaling" already exists.');
    } else {
      console.log('Collection "signaling" created.');
    }
  } catch (err: any) {
    console.error('Error creating signaling collection:', err.message);
  }

  await sleep(1000);

  // Attributes for signaling
  const signalingAttributes = [
    { type: 'string', key: 'roomId', size: 36, required: true },
    { type: 'string', key: 'senderId', size: 36, required: true },
    { type: 'string', key: 'receiverId', size: 36, required: true },
    { type: 'enum', key: 'type', elements: ['offer', 'answer', 'candidate', 'knock', 'knock-admitted', 'knock-declined'], required: true },
    { type: 'string', key: 'payload', size: 8192, required: true },
  ];

  for (const attr of signalingAttributes) {
    try {
      let path = `/databases/${dbId}/collections/signaling/attributes/${attr.type}`;
      if (attr.type === 'string') {
        await apiRequest(path, 'POST', {
          key: attr.key,
          size: attr.size,
          required: attr.required,
        });
      } else if (attr.type === 'enum') {
        await apiRequest(path, 'POST', {
          key: attr.key,
          elements: (attr as any).elements,
          required: attr.required,
        });
      }
      console.log(`Attribute signaling.${attr.key} created.`);
      await sleep(500);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('409')) {
        console.log(`Attribute signaling.${attr.key} already exists. Attempting update...`);
        try {
          if (attr.type === 'enum') {
            await apiRequest(`/databases/${dbId}/collections/signaling/attributes/enum/${attr.key}`, 'PATCH', {
              elements: (attr as any).elements,
              required: attr.required,
              default: 'offer',
            });
            console.log(`Attribute signaling.${attr.key} updated with new elements.`);
          }
        } catch (updateErr: any) {
          console.warn(`Attribute signaling.${attr.key} update note:`, updateErr.message);
        }
      } else {
        console.warn(`Attribute signaling.${attr.key} warning:`, err.message);
      }
    }
  }

  // 4. Messages Collection
  try {
    const res = await apiRequest(`/databases/${dbId}/collections`, 'POST', {
      collectionId: 'messages',
      name: 'Messages',
      permissions: [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")',
      ],
      documentSecurity: false,
      enabled: true,
    });
    if (res.status === 409) {
      console.log('Collection "messages" already exists.');
    } else {
      console.log('Collection "messages" created.');
    }
  } catch (err: any) {
    console.error('Error creating messages collection:', err.message);
  }

  await sleep(1000);

  // Attributes for messages
  const messageAttributes = [
    { type: 'string', key: 'roomId', size: 36, required: true },
    { type: 'string', key: 'senderId', size: 36, required: true },
    { type: 'string', key: 'senderName', size: 32, required: true },
    { type: 'string', key: 'content', size: 1000, required: true },
  ];

  for (const attr of messageAttributes) {
    try {
      let path = `/databases/${dbId}/collections/messages/attributes/${attr.type}`;
      await apiRequest(path, 'POST', {
        key: attr.key,
        size: attr.size,
        required: attr.required,
      });
      console.log(`Attribute messages.${attr.key} created.`);
      await sleep(500);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('409')) {
        console.log(`Attribute messages.${attr.key} already exists.`);
      } else {
        console.warn(`Attribute messages.${attr.key} warning:`, err.message);
      }
    }
  }

  console.log('\nSynCine Appwrite schema setup finished successfully.');
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
