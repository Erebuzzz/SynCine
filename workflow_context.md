# SynCine: Agent Workflow & Context State

This document preserves the current implementation state, architectural decisions, and operational details for any agent continuing work on this project.

## 1. Project Overview & Credentials
- **Project Name:** SynCine
- **Application Type:** Real-time synchronized collaborative movie streaming platform (WebRTC mesh + Appwrite Cloud)
- **Appwrite Endpoint:** `https://sgp.cloud.appwrite.io/v1`
- **Appwrite Project ID:** `6a97c0ed000188adaed0`
- **Database ID:** `syncine_db`
- **Capacity Constraint:** Strictly 4 maximum participants per room

## 2. Implemented Schema & Collections (Appwrite Cloud)
All collections have been provisioned in `syncine_db` on project `6a97c0ed000188adaed0`:
1. **`rooms` collection:**
   - `name` (string, size: 64, required)
   - `hostId` (string, size: 36, required)
   - `syncState` (string, size: 4096, optional)
   - `mediaMode` (enum: `['screen', 'local_file']`, required)
   - `participantCount` (integer, min: 1, max: 4, default: 1)
   - `maxParticipants` (integer, min: 1, max: 4, default: 4)
   - Permissions: `read("any")`, `create("users")`, `update("users")`, `delete("users")`

2. **`signaling` collection (Document-Level Security Enabled):**
   - `roomId` (string, size: 36, required)
   - `senderId` (string, size: 36, required)
   - `receiverId` (string, size: 36, required)
   - `type` (enum: `['offer', 'answer', 'candidate']`, required)
   - `payload` (string, size: 8192, required)
   - Collection permissions: `create("users")`
   - Document permissions: `read(Role.user(receiverId))`, `write(Role.user(senderId))`

3. **`messages` collection:**
   - `roomId` (string, size: 36, required)
   - `senderId` (string, size: 36, required)
   - `senderName` (string, size: 32, required)
   - `content` (string, size: 1000, required)
   - Permissions: `read("any")`, `create("users")`

## 3. Implemented Modules & Source Structure
- `src/lib/appwrite.ts`: Appwrite client, anonymous session manager, typed Realtime wrapper, collections constants.
- `src/lib/media-capture.ts`: Cross-browser display/mic capture with Safari user agent detection to omit audio constraints and prevent `DOMException`.
- `src/lib/webrtc.ts`: P2P mesh WebRTC engine with H.264 transceiver codec preference, dynamic track replacement, and Appwrite signaling exchange.
- `src/lib/sync-engine.ts`: Drift-compensated playback synchronizer with network latency benchmarking and 350ms seek jitter threshold.
- `src/components/LiquidGlassFilters.tsx`: Procedural SVG filter definitions combining `<feTurbulence>` and `<feDisplacementMap>` for optical refraction and 35mm film grain.
- `src/components/DraggableTile.tsx`: Floating draggable participant overlay with liquid glass styling, pointer capture, and independent audio volume controls.
- `src/components/WatchStage.tsx`: Unified stage supporting Theater (4/5 width), Grid (2x2), and Floating layouts with liquid glass control dock, Picture-in-Picture, and Fullscreen.
- `src/components/ChatSidebar.tsx`: Real-time room text chat with liquid glass drawer and translucent message bubbles.
- `src/components/Lobby.tsx`: Liquid glass room creation and joining cards with ambient floating gradient orbs and 4-user capacity enforcement.
- `src/components/RoomView.tsx`: Main room container coordinating WebRTC, synchronizer, media capture, and stage views.
- `functions/cleanup-stale-signals/`: Node.js serverless cron function (`*/5 * * * *`) purging signaling documents older than 10 minutes.

## 4. Verification & Validation Status
- **Vitest Suites:** 3/3 test files passed (9/9 unit tests) covering media capture constraints, synchronizer jitter thresholds, and WebRTC signaling.
- **TypeScript & Vite Build:** `tsc && vite build` completed successfully with zero compiler errors.
- **CI/CD:** `.github/workflows/deploy.yml` configured for automated test and Cloudflare Pages deployment.

## 5. Next Steps / Potential Extensions
- Additional audio mixer enhancements (e.g. noise gate, audio ducking when participants speak).
- Room password protection support.
- Subtitles / WebVTT file sync for local file mode.
