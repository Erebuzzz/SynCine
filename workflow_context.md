# SynCine: Agent Workflow & Context State

This document preserves the current implementation state, architectural decisions, and operational details for any agent continuing work on this project.

## 1. Project Overview & Credentials
- **Project Name:** SynCine
- **Thematic Origin:** Inspired by the Greek root "Syn" (Σύν - Together / Simultaneous / United) & Norse-minimal runic geometry
- **Application Type:** Real-time synchronized collaborative movie streaming platform (WebRTC mesh + Appwrite Cloud)
- **Appwrite Endpoint:** `https://sgp.cloud.appwrite.io/v1`
- **Appwrite Project ID:** `6a97c0ed000188adaed0`
- **Database ID:** `syncine_db`
- **Capacity Constraint:** Strictly 4 maximum participants per room
- **Room Lifecycle Policy:** Ephemeral guest rooms reset after 3 hours; authenticated host rooms are permanent. Zero user tracking or invasive data collection.

## 2. Visual Identity & Apple-Minimal Cinema Design System
The interface follows an Apple-minimal, editorial dark cinema aesthetic (inspired by Apple macOS/iOS dark mode, Lucerra.co, The Nocturne, and Google Meet):
1. **Color Tokens (Dual Dark / Light Mode):**
   - **Dark Mode (Default):** Pure OLED black (`#000000`) background with neutral white-alpha glass surfaces (`rgba(255,255,255,0.04)`), text primary (`#F5F5F7`), text secondary (`rgba(255,255,255,0.55)`), and single warm antique gold accent (`#C8A97E`) reserved for primary CTAs and active states.
   - **Light Mode:** Pure white (`#FFFFFF`) background with neutral black-alpha glass surfaces (`rgba(0,0,0,0.03)`), dark text primary (`#1D1D1F`), and warm gold accent (`#8B7355`).
   - **Zero Neon:** All saturated indigo, pink, and cyan neon gradients, colored glow drop-shadows, and pulsating badges are completely eliminated.
2. **Norse S+C Merged Logo ([`SynIcons.tsx`](file:///d:/SynCine/src/components/icons/SynIcons.tsx)):**
   - Runic convergence stroke merging S (Syn) and C (Cine) rendered with a single warm accent stroke (`#C8A97E`) and central play triangle. All icons use `currentColor`.
3. **Atmospheric Canvas ([`ShaderCanvas.tsx`](file:///d:/SynCine/src/components/ShaderCanvas.tsx)):**
   - Barely perceptible warm atmospheric drift on pure black with reduced-motion support and tab visibility pause.
4. **Cinematic Film Grain:**
   - Procedural SVG noise texture overlay running at reduced opacity (0.02) for subtle filmic depth.

## 3. Google Meet Layout & Control Architecture
1. **Low Cognitive Load & High Discoverability:**
   - Center-stage primary media presentation with dynamic, proportional participant video tiles.
   - Clean rounded controls with unambiguous visual states (e.g. active mic volume levels, camera states, connection health).
2. **Dock & Drawer Organization:**
   - Centralized bottom dock for high-frequency call controls (Mic, Camera, Screen Cast, Layout Switcher, Call Termination).
   - Non-intrusive collapsible side drawers for secondary actions (In-room chat, Participant list, Live audio mixer).
3. **Pre-Meeting Green Room ([`GreenRoom.tsx`](file:///d:/SynCine/src/components/GreenRoom.tsx)):**
   - Device check screen allowing participants to test camera, microphone, audio levels, and display name prior to entry.

## 4. Implemented Schema & Collections (Appwrite Cloud)
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

## 5. Core Modules & Engine Structure
- `src/lib/appwrite.ts`: Appwrite client, optional email/password auth, anonymous session fallback, 3-hour TTL room manager.
- `src/lib/media-capture.ts`: Cross-browser display/mic capture with Safari user agent detection to omit audio constraints and prevent `DOMException`.
- `src/lib/webrtc.ts`: P2P mesh WebRTC engine with H.264 transceiver codec preference, dynamic track replacement, and Appwrite signaling exchange.
- `src/lib/sync-engine.ts`: Drift-compensated playback synchronizer with network latency benchmarking and 350ms seek jitter threshold.
- `src/components/DraggableTile.tsx`: Floating draggable participant overlay with pointer capture and independent audio volume controls.
- `src/components/WatchStage.tsx`: Unified stage supporting Theater (4/5 width), Grid (2x2), and Floating layouts with Picture-in-Picture, Fullscreen, and live multi-peer audio mixer.
- `src/components/ChatSidebar.tsx`: Real-time room text chat with auto-scroll and unread counter badges.
- `src/components/Lobby.tsx`: Apple-minimal watchroom creation and code joining flow with editorial feature showcase.
- `src/components/GreenRoom.tsx`: Google Meet pre-meeting device check screen.
- `src/components/AuthModal.tsx`: Optional host sign in / sign up dialog for permanent rooms.
- `src/components/RoomView.tsx`: Main room container coordinating Green Room, WebRTC, synchronizer, media capture, and stage views.
- `functions/cleanup-stale-signals/`: Node.js serverless cron function (`*/5 * * * *`) purging signaling documents older than 10 minutes.

## 6. Verification & Validation Status
- **Vitest Suites:** 3/3 test files passed (9/9 unit tests) covering media capture constraints, synchronizer jitter thresholds, and WebRTC signaling.
- **TypeScript & Vite Build:** `tsc && vite build` completed successfully with zero compiler errors.
- **Main Branch:** Synced and pushed to GitHub repository `origin/main`.
