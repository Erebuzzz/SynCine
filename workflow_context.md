# SynCine: Agent Workflow & Context State

This document preserves the current implementation state, architectural decisions, and operational details for any agent continuing work on this project.

## 1. Project Overview & Credentials
- **Project Name:** SynCine
- **Thematic Origin:** Inspired by the Greek root "Syn" (Σύν - Together / Simultaneous / United)
- **Application Type:** Real-time synchronized collaborative movie streaming platform (WebRTC mesh + Appwrite Cloud)
- **Appwrite Endpoint:** `https://sgp.cloud.appwrite.io/v1`
- **Appwrite Project ID:** `6a97c0ed000188adaed0`
- **Database ID:** `syncine_db`
- **Capacity Constraint:** Strictly 4 maximum participants per room
- **Room Lifecycle Policy:** Ephemeral guest rooms reset after 3 hours; authenticated host rooms are permanent. Zero user tracking or invasive data collection.

## 2. Implemented Schema & Collections (Appwrite Cloud)
All collections have been provisioned in `syncine_db` on project `6a97c0ed000188adaed0`:
1. **`rooms` collection:**
   - `name` (string, size: 64, required)
   - `hostId` (string, size: 36, required)
   - `syncState` (string, size: 4096, optional)
   - `mediaMode` (enum: `['screen', 'local_file']`, required)
   - `participantCount` (integer, min: 1, max: 4, default: 1)
   - `maxParticipants` (integer, min: 1, max: 4, default: 4)
   - `isPermanent` (boolean, default: false)
   - `expiresAt` (string, size: 64, optional)
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

## 3. UI & UX Architecture (Google Meet & Apple VisionOS Standards)
- **Fluid Vertical Scrolling:** Fixed previous viewport overflow locks, enabling smooth momentum scrolling on Lobby, landing showcases, and modals.
- **`src/components/GreenRoom.tsx`:** Google Meet-inspired pre-meeting device check for camera, microphone, live acoustic visualizer, and display name confirmation before entering.
- **`src/components/AuthModal.tsx`:** Optional Appwrite Auth dialog allowing hosts to create permanent vanity rooms without requiring guests to register.
- **`src/components/icons/SynIcons.tsx`:** Handcrafted SVG icons and Greek Sigma "Σ" / Cinema infinity convergence logo mark. Zero emojis.
- **`src/components/ShaderCanvas.tsx`:** 60fps WebGL fluid gradient shader background (zero external 3D engine overhead, adaptive across Safari, Chrome, Firefox, Mobile, iOS, and Android).
- **`src/components/LiquidGlassCard.tsx`:** Multi-layered glassmorphic container with 24px backdrop blur, specular edge bevel glow, and responsive variants.

## 4. Core Modules & Engine Structure
- `src/lib/appwrite.ts`: Appwrite client, optional email/password auth, anonymous session fallback, 3-hour TTL room manager.
- `src/lib/media-capture.ts`: Cross-browser display/mic capture with Safari user agent detection to omit audio constraints and prevent `DOMException`.
- `src/lib/webrtc.ts`: P2P mesh WebRTC engine with H.264 transceiver codec preference, dynamic track replacement, and Appwrite signaling exchange.
- `src/lib/sync-engine.ts`: Drift-compensated playback synchronizer with network latency benchmarking and 350ms seek jitter threshold.
- `src/components/DraggableTile.tsx`: Floating draggable participant overlay with pointer capture and independent audio volume controls.
- `src/components/WatchStage.tsx`: Unified stage supporting Theater (4/5 width), Grid (2x2), and Floating layouts with Picture-in-Picture, Fullscreen, and live multi-peer audio mixer.
- `src/components/ChatSidebar.tsx`: Real-time room text chat with auto-scroll and unread counter badges.
- `src/components/Lobby.tsx`: Google Meet-inspired watchroom creation and code joining flow with editorial feature showcase.
- `src/components/RoomView.tsx`: Main room container coordinating Green Room, WebRTC, synchronizer, media capture, and stage views.
- `functions/cleanup-stale-signals/`: Node.js serverless cron function (`*/5 * * * *`) purging signaling documents older than 10 minutes.

## 5. Verification & Validation Status
- **Vitest Suites:** 3/3 test files passed (9/9 unit tests) covering media capture constraints, synchronizer jitter thresholds, and WebRTC signaling.
- **TypeScript & Vite Build:** `tsc && vite build` completed successfully with zero compiler errors.
- **Pull Request #1:** Active on GitHub repository `https://github.com/Erebuzzz/SynCine/pull/1`.
