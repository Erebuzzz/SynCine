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
- `src/lib/appwrite.ts`: Appwrite client, optional email/password auth, anonymous session fallback, 3-hour TTL room manager, 9-character code generator (`generateRoomCode()`, `formatRoomCode()`, `normalizeRoomCode()`).
- `src/lib/time-cycle.ts`: Indian Standard Time (IST) sunrise/sunset cycle and dynamic glass reflection angle generator.
- `src/lib/media-capture.ts`: Cross-browser display/mic capture, device enumeration (`getAudioInputDevices`, `getAudioOutputDevices`, `getVideoInputDevices`), resolution presets (`1080p`, `720p`, `480p`, `360p`), audio output routing (`setSinkId`), and acoustic test chime.
- `src/lib/diagnostics.ts`: Live WebRTC telemetry collector (RTT, Jitter, Packet Loss, Bitrate), frame loop jitter benchmark for CPU/system rendering load, and root cause analysis advisor.
- `src/lib/webrtc.ts`: P2P mesh WebRTC engine with dynamic track replacement, encoding bitrate adaptation, and Appwrite signaling exchange.
- `src/lib/sync-engine.ts`: Drift-compensated playback synchronizer with network latency benchmarking and 350ms seek jitter threshold.

## 6. Stage Settings & Performance Diagnostics
- **Settings Modal (`SettingsModal.tsx`):**
  - **Audio:** Microphone selector with live input meter, output speaker selector with acoustic chime test, noise suppression & echo cancellation toggle.
  - **Video & Quality:** Camera hardware selector, 4 resolution quality cards (`1080p`, `720p`, `480p`, `360p`) with live mirror preview and dynamic encoding bitrate adaptation.
  - **Diagnostics:** HTML5 Canvas rolling sparkline graph plotting 30 seconds of RTT latency, WebRTC telemetry cards (RTT, Jitter, Loss %, Bitrate), CPU/UI thread responsiveness meter, and smart root-cause analysis banner.

## 7. Adaptive Mobile & Tablet Experience
- **Cinema Viewport & Theater Mode:**
  - On desktop (`md:`): Video stage with vertical participant sidebar on the right (`md:w-76 md:h-full md:border-l`).
  - On mobile/tablet (`< md`): Video stage maintains full width with participants docked beneath as a swipeable horizontal thumbnail carousel (`w-full border-t flex-row overflow-x-auto`), preventing movie display distortion.
- **Header & Action Bar:**
  - Fluid typography, truncated room names (`max-w-[80px] sm:max-w-[200px]`), and compact touch controls (minimum 40-44px touch targets).
  - Watchroom invite code hidden on small phones to preserve critical controls.
- **Bottom Control Dock:**
  - Non-wrapping, horizontally scrollable button bar with safe-area spacing ensuring buttons (Mic, Camera, Screen share/file, Settings, Leave) never clip or overflow.
- **Chat Drawer:**
  - Full-width slide-over drawer on mobile devices (`w-full sm:w-80`) with dedicated close button and message composer.
- **Draggable Viewports (`DraggableTile`):**
  - Viewport-relative boundary clamping on touch pointer move, ensuring floating participant tiles never get dragged outside screen boundaries or under navigation bars.
- **Modals & Dialogs (`SettingsModal`, `PrivacyModal`, `TermsModal`, `DocsModal`, `AuthModal`):**
  - Responsive dialog envelopes (`p-2.5 sm:p-4`, `max-h-[92vh]`), touch-friendly tabs, and stacked mobile actions.

## 8. Camera Preview & WebRTC Stream Binding
- **Green Room Staging (`GreenRoom.tsx`):**
  - Resolved race condition where `videoPreviewRef.current` was null when `getUserMedia` resolved prior to component DOM mount.
  - Implemented callback refs `ref={(el) => { ... el.srcObject = previewStream; el.play(); }}` and reactive `useEffect([previewStream, isVideoOn])` to guarantee instantaneous video feed display.
  - Added track-level toggle handlers (`handleToggleMic`, `handleToggleVideo`) allowing user to mute or unmute their camera without destroying the active media stream or triggering browser permission re-prompts.
  - Added robust fallback cascade in `captureUserMedia` (`exact` -> `ideal` -> basic `{ video: true, audio: true }` -> audio-only) so external webcams and virtual cameras never fail silently.

## 9. Stage Layout Architecture & Stream Smoothness
- **Separated Screen Cast (3:1 / 4:1 Ratio):**
  - When screen share or local file video is active: Left container occupies 75% to 80% width (`flex-1 md:flex-[3] lg:flex-[4]`) dedicated to the shared screen/video, while the right container (`md:w-76 lg:w-80 xl:w-96`) houses participant camera feeds cleanly separated by a vertical border.
  - This 3:1 / 4:1 separated layout is preserved in Fullscreen mode (`mainStageContainerRef`), ensuring zero overlap or hindrance between camera feeds and the broadcast.
- **Symmetrical Stage Coverage when Screen Share is Off:**
  - When screen cast is inactive (`!hasActiveMedia`), the stage symmetrically distributes participant camera feeds across the entire stage (1 tile centered, 2 tiles side-by-side, 3 or 4 in 2x2 grid) with a floating standby pill at the top, maximizing camera visibility without squished sidebars.
- **Stream Refresh / Blinking Prevention:**
  - Prevented decoder resets and stream blinking by guarding all video elements with `if (el.srcObject !== mediaStream) el.srcObject = mediaStream;`.
  - Gated live WebRTC telemetry polling behind `isSettingsOpen` in `RoomView.tsx` to eliminate 40 unneeded re-renders per minute during normal watching.
- **Accurate Participant Count:**
  - Fixed `totalUsersInRoom` in `WatchStage.tsx` from `participants.length + 1` to `participants.length` (since `participants` already includes self and remote users), accurately displaying `1/4` when alone.
- **Right-Docked Floating Layout:**
  - Floating draggable tiles now default to `x: window.innerWidth - 280`, keeping them docked along the right edge to avoid obstructing the primary video stage.

## 10. Verification & Validation Status
- **Vitest Suites:** 4/4 test files passed (13/13 unit tests) covering media capture constraints, synchronizer jitter thresholds, WebRTC signaling, and performance diagnostics.
- **TypeScript & Vite Build:** `tsc && vite build` completed successfully with zero compiler errors in 3.38s.
- **Main Branch:** Synced and pushed to GitHub repository `origin/main`.
