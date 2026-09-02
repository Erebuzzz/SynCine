# SynCine: Agent Workflow & Context State

This document preserves the current implementation state, architectural decisions, and operational details for any agent continuing work on this project.

## 1. Project Overview & Credentials
- **Project Name:** SynCine
- **Thematic Origin:** S+C interlocking convergence (Syn + Cine: united collaborative cinema)
- **Application Type:** Real-time synchronized collaborative movie streaming platform (WebRTC mesh + Appwrite Cloud)
- **Appwrite Endpoint:** `https://sgp.cloud.appwrite.io/v1`
- **Appwrite Project ID:** `6a97c0ed000188adaed0`
- **Database ID:** `syncine_db`
- **Registered Platforms:**
  - `syncine.vercel.app`
  - `localhost`
- **Capacity Constraint:** Strictly 4 maximum participants per room
- **Room Code Format:** 9-character memorable codes (e.g. `c7k-9m2-p4q`), with normalization supporting both plain alphanumeric strings (`c7k9m2p4q`), hyphenated strings, and full invite links.
- **Room Lifecycle Policy:** Ephemeral guest rooms reset after 3 hours; authenticated host rooms are permanent. Zero user tracking or invasive data collection.

## 2. Visual Identity & Realistic Glassmorphic Design System
The interface follows an Apple-minimal, editorial cinema design system:
1. **Color Tokens & Automatic IST Day/Night Cycle:**
   - **Timezone Aware:** Follows Indian Standard Time (IST - UTC+5:30) sunrise/sunset cycle.
   - **Daytime (06:00 to 18:30 IST):** Defaults to clean Light Mode (`#FAFAFA` with subtle warm glass).
   - **Nighttime (18:30 to 06:00 IST):** Defaults to OLED Dark Mode (`#000000` with neutral white-alpha glass).
   - **Manual User Control:** The user can toggle between Dark and Light mode at any time, persisted via `localStorage.getItem('syncine-theme-manual')`.
2. **Realistic Glassmorphism Reflections ([`time-cycle.ts`](file:///d:/SynCine/src/lib/time-cycle.ts)):**
   - Dynamic reflection gradient angle calculated from the sun's position throughout the day in IST:
     - Morning (06:00 - 12:00 IST): Sun sweeps east at 110deg to 135deg with warm morning sheen.
     - Afternoon to Sunset (12:00 - 18:30 IST): Sun sweeps west from 135deg to 165deg.
     - Night (18:30 - 06:00 IST): Moonlit specular reflection at 135deg with subtle cool specular edge.
   - Specular top edge highlight (`box-shadow: inset 0 1px 0 0 var(--glass-specular-edge)`).
3. **Custom Transparent Accent Cursor ([`CustomCursor.tsx`](file:///d:/SynCine/src/components/CustomCursor.tsx)):**
   - Trailing outer ring with semi-transparent accent color (`var(--accent)`) and precision inner accent dot.
   - Smooth lerp follower physics (0.18 factor) running at 60/120fps via `requestAnimationFrame`.
   - Automatic hover scaling (1.8x - 2.2x) on interactive elements (`button`, `a`, `input`, `[role="button"]`, `.cursor-pointer`).
   - Automatically disabled on touch devices (`pointer: coarse`) and when `prefers-reduced-motion` is active.
4. **Interactive 404 Cinema Mini-Game ([`NotFound.tsx`](file:///d:/SynCine/src/components/NotFound.tsx)):**
   - Embedded "Cinema Reel Sync Runner" canvas game on the 404 page.
   - Player controls a rolling gold film reel jumping over glitch obstacles and collecting sync diamonds.
   - Synthesized audio effects via Web Audio API, keyboard (Space / ArrowUp) and touch controls, with high score persisted in `localStorage`.
5. **Privacy Policy & Terms of Service ([`PrivacyModal.tsx`](file:///d:/SynCine/src/components/PrivacyModal.tsx), [`TermsModal.tsx`](file:///d:/SynCine/src/components/TermsModal.tsx)):**
   - Production-ready legal disclosures covering peer-to-peer WebRTC encryption, zero cloud video storage, and 10-minute ephemeral signaling cleanup.
6. **Typography (Geist Sans):**
   - Modern, elegant Geist font loaded via Google Fonts with optical weights.
   - Elimination of hacker `//` symbols, terminal prompts, and unnecessary technical claim badges.
7. **S+C Interlocking Convergence Logo ([`SynIcons.tsx`](file:///d:/SynCine/src/components/icons/SynIcons.tsx)):**
   - Clean geometric convergence merging the letters 'S' (Syn) and 'C' (Cine) with a central playback triangle.
8. **Atmospheric Canvas ([`ShaderCanvas.tsx`](file:///d:/SynCine/src/components/ShaderCanvas.tsx)):**
   - Barely perceptible warm atmospheric drift on pure black with reduced-motion support and tab visibility pause.

## 3. SEO, Metadata & Production Assets
- **`index.html`:** Accurate meta descriptions, canonical link (`https://syncine.app/`), and JSON-LD structured data Schema (`WebApplication`).
- **`public/robots.txt`:** Production search engine directives.
- **`public/sitemap.xml`:** XML sitemap index.
- **`public/llms.txt`:** Machine-readable platform architecture for AI discovery.
- **`src/components/DocsModal.tsx`:** Dedicated technical documentation modal detailing the WebRTC mesh, drift sync algorithm, and ephemeral room buffer.
- **`src/components/PrivacyModal.tsx`:** Production Privacy Policy modal.
- **`src/components/TermsModal.tsx`:** Production Terms of Service modal.
- **`src/components/NotFound.tsx`:** Custom 404 page with playable cinema arcade game.

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
   - Permissions: `read("any")`, `create("any")`, `update("any")`, `delete("any")`

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
- `src/lib/time-cycle.ts`: Indian Standard Time (IST) sunrise/sunset cycle and dynamic glass reflection angle generator.
- `src/lib/media-capture.ts`: Cross-browser display/mic capture with Safari user agent detection to omit audio constraints and prevent `DOMException`.
- `src/lib/webrtc.ts`: P2P mesh WebRTC engine with H.264 transceiver codec preference, dynamic track replacement, and Appwrite signaling exchange.
- `src/lib/sync-engine.ts`: Drift-compensated playback synchronizer with network latency benchmarking and 350ms seek jitter threshold.

## 5. Media & WebRTC Mesh Streaming Details
- **Camera Feed & Multi-party Video:**
  - `WebRTCEngine` supports both microphone (`attachMicStream`) and camera (`attachCameraStream`, `removeCameraStream`).
  - Automatic peer discovery via `announceJoin`: When any participant enters the room, an announcement is broadcast over Appwrite Realtime so all active peers proactively initiate peer connections.
  - Distinct stream tracking ensures screen broadcasts (the movie) are separated from participant webcam video feeds via stream ID matching and signaling metadata.
  - Local user camera feed ("You") is rendered in the Theater lateral sidebar, Grid view, and Floating draggable tiles with mirror styling (`scale-x-[-1]`), mute safeguards, and camera-off avatar fallbacks.
  - Bottom dock features a dedicated Camera Toggle button alongside the Microphone Toggle button for real-time webcam activation.
- **Watchroom Chat Drawer:**
  - `ChatSidebar` close button ('X') explicitly wired with event propagation guards to toggle and close drawer smoothly.

- `src/components/CustomCursor.tsx`: Custom transparent accent cursor with fluid lerp physics and interactive element scaling.
- `src/components/DraggableTile.tsx`: Floating draggable participant overlay with pointer capture and independent audio volume controls.
- `src/components/WatchStage.tsx`: Unified stage supporting Theater (4/5 width), Grid (2x2), and Floating layouts with Picture-in-Picture, Fullscreen, and live multi-peer audio mixer.
- `src/components/ChatSidebar.tsx`: Real-time room text chat with auto-scroll and unread counter badges.
- `src/components/Lobby.tsx`: Clean, human-centered watchroom creation and code joining flow with realistic glass reflections.
- `src/components/GreenRoom.tsx`: Pre-meeting camera and microphone staging screen.
- `src/components/AuthModal.tsx`: Optional host sign in / sign up dialog for permanent rooms.
- `src/components/DocsModal.tsx`: System architecture & technical documentation modal.
- `src/components/PrivacyModal.tsx`: Privacy Policy modal with zero-video-storage guarantees.
- `src/components/TermsModal.tsx`: Terms of Service modal.
- `src/components/NotFound.tsx`: Custom 404 page with playable cinema arcade game.
- `src/components/RoomView.tsx`: Main room container coordinating Green Room, WebRTC, synchronizer, media capture, and stage views.
- `functions/cleanup-stale-signals/`: Node.js serverless cron function (`*/5 * * * *`) purging signaling documents older than 10 minutes.

## 6. Verification & Validation Status
- **Vitest Suites:** 3/3 test files passed (9/9 unit tests) covering media capture constraints, synchronizer jitter thresholds, and WebRTC signaling.
- **TypeScript & Vite Build:** `tsc && vite build` completed successfully with zero compiler errors in 5.71s.
- **Main Branch:** Synced and pushed to GitHub repository `origin/main`.
