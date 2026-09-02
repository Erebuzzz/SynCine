# SynCine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-FD366E?logo=appwrite&logoColor=white)](https://appwrite.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

SynCine is a zero-cost, cross-browser collaborative streaming and synchronized movie-watching web application built on WebRTC and Appwrite Cloud.

It decouples the Control and Signaling Plane from the Media Transport Plane, eliminating expensive media servers and streaming video directly via client-side WebRTC mesh or distributed local file synchronization.

---

## System Architecture

```mermaid
graph TD
    subgraph Appwrite_Cloud [Appwrite Cloud Backend - Control & Signaling Plane]
        Auth[Anonymous Auth & Session Manager]
        DB[Appwrite Database: syncine_db]
        RoomsCol[Rooms Collection - State & 4 User Limit]
        SigCol[Signaling Collection - DLS Protected]
        MsgCol[Messages Collection - Room Chat]
        Realtime[Appwrite Realtime WebSocket]
        Cron[5-min Cron Cleanup Function]
    end

    subgraph Host_Node [Host Client Node]
        HostCapture[Screen / Tab Capture Engine]
        HostSync[Playback Synchronizer - Origin Timestamps]
        HostRTC[WebRTC PeerConnection Manager]
    end

    subgraph Viewer_Nodes [Viewer Client Nodes - Up to 3 Viewers]
        Viewer1[Viewer Node 1]
        Viewer2[Viewer Node 2]
        Viewer3[Viewer Node 3]
    end

    subgraph NAT [NAT Traversal]
        STUN[Google STUN & Metered TURN Relays]
    end

    HostRTC <-->|WebRTC Direct P2P Mesh - RTP/SRTP Media| Viewer1
    HostRTC <-->|WebRTC Direct P2P Mesh - RTP/SRTP Media| Viewer2
    HostRTC <-->|WebRTC Direct P2P Mesh - RTP/SRTP Media| Viewer3

    HostRTC -.->|Signaling Exchange| Realtime
    Viewer1 -.->|Signaling Exchange| Realtime
    Viewer2 -.->|Signaling Exchange| Realtime
    Viewer3 -.->|Signaling Exchange| Realtime

    Realtime <--> SigCol
    Realtime <--> RoomsCol
    Realtime <--> MsgCol
    Cron -->|Purge Signals > 10 min| SigCol
    HostRTC -.-> STUN
    Viewer1 -.-> STUN
```

---

## WebRTC Signaling Handshake Flow

```mermaid
sequenceDiagram
    autonumber
    participant Host as Host Client
    participant Appwrite as Appwrite Realtime / DB
    participant Viewer as Viewer Client (Peer)

    Note over Host,Viewer: Anonymous Session Initialized
    Host->>Appwrite: Create Room (syncine_db.rooms)
    Viewer->>Appwrite: Query Room & Join (Capacity Check <= 4)
    Viewer->>Appwrite: Initiate Handshake (Create SDP Offer)
    Appwrite-->>Host: Realtime Signal Notification (type: offer)
    Host->>Host: Set Remote Description (Offer) & Create Answer
    Host->>Appwrite: Send SDP Answer (DLS: read Role.user(viewerId))
    Appwrite-->>Viewer: Realtime Signal Notification (type: answer)
    Viewer->>Viewer: Set Remote Description (Answer)
    Host->>Appwrite: Send ICE Candidates
    Viewer->>Appwrite: Send ICE Candidates
    Appwrite-->>Viewer: Dispatch Host ICE Candidates
    Appwrite-->>Host: Dispatch Viewer ICE Candidates
    Note over Host,Viewer: Direct P2P WebRTC Mesh Connected
```

---

## Drift-Compensated Playback Sync (Local File Mode)

```mermaid
sequenceDiagram
    autonumber
    participant HostVideo as Host Video Player
    participant SyncEngine as Host Playback Synchronizer
    participant AppwriteDB as Appwrite Database
    participant ViewerSync as Viewer Playback Synchronizer
    participant ViewerVideo as Viewer Video Player

    Note over HostVideo,ViewerVideo: Both participants load identical local video file (.mp4 / .mkv)
    HostVideo->>SyncEngine: User triggers Play / Pause / Seek
    SyncEngine->>AppwriteDB: Update rooms.syncState (action, currentTime, originTimestamp)
    AppwriteDB-->>ViewerSync: Realtime Push syncState update
    ViewerSync->>ViewerSync: Compute Transit Delay: (now + latency - originTimestamp)
    ViewerSync->>ViewerSync: Evaluate 350ms Jitter Threshold
    alt Delta > 350ms
        ViewerSync->>ViewerVideo: Seek to (currentTime + transitDelay)
    end
    ViewerSync->>ViewerVideo: Sync Play/Pause state without re-broadcasting
```

---

## Core Capabilities

### 1. Dual Playback Modes
- **Screen / Tab Sharing:** The host captures a tab or application window with `getDisplayMedia`. Audio and video tracks are negotiated via H.264 over direct WebRTC peer connections.
- **Local File Sync:** Zero upload bandwidth mode where participants drop identical local video files into their browsers (`URL.createObjectURL(file)`). Playback state (play, pause, seek) synchronizes with round-trip latency compensation.

### 2. Participant Limits & Security
- **Strict Capacity:** Limited to a maximum of 4 participants per room to guarantee low P2P mesh CPU and bandwidth overhead.
- **Document-Level Security (DLS):** Ephemeral WebRTC signaling documents (`signaling`) are restricted so only the intended recipient can read the SDP payloads.
- **Automated Ephemeral Cleanup:** An Appwrite serverless function executes on a 5-minute cron schedule (`*/5 * * * *`) to purge signaling documents older than 10 minutes.

### 3. Cross-Browser Optimization
- **Safari Audio Guard:** Detects WebKit/Safari user agents and omits audio constraints on `getDisplayMedia` to prevent fatal `DOMException` errors.
- **H.264 Codec Priority:** WebRTC transceivers set codec preferences prioritizing `video/h264` for macOS and iOS hardware decoding.
- **Pointer-Safe Floating Viewport:** Drag participant video tiles freely across the stage with pointer capture (`setPointerCapture`) and `touchAction: none` to isolate dragging from page scroll or zoom.

---

## Project Structure

```
SynCine/
├── .agents/skills/                   # Appwrite agent skills
├── .cursor/rules/appwrite.mdc        # Appwrite architectural rules
├── .github/workflows/deploy.yml      # CI/CD deployment workflow
├── functions/
│   └── cleanup-stale-signals/        # Appwrite serverless cleanup cron function
│       ├── package.json
│       └── src/main.js
├── scripts/
│   └── setup-appwrite.ts             # Appwrite database provisioning script
├── src/
│   ├── components/
│   │   ├── icons/
│   │   │   └── SynIcons.tsx          # Handcrafted Greek Sigma & cinema SVG icons
│   │   ├── ChatSidebar.tsx           # Real-time room text chat drawer
│   │   ├── DraggableTile.tsx         # Floating draggable participant video
│   │   ├── LiquidGlassCard.tsx       # Reusable Apple VisionOS glassmorphic card
│   │   ├── LiquidGlassFilters.tsx    # Procedural feTurbulence & feDisplacementMap filters
│   │   ├── Lobby.tsx                 # Watchroom creation, joining & guest auth
│   │   ├── RoomView.tsx              # Room container & WebRTC coordinator
│   │   ├── ShaderCanvas.tsx          # 60fps WebGL fluid gradient canvas
│   │   └── WatchStage.tsx            # Theater, Grid & Floating viewport stage
│   ├── lib/
│   │   ├── appwrite.ts               # Appwrite client singleton & types
│   │   ├── media-capture.ts          # Screen & mic capture with Safari guards
│   │   ├── sync-engine.ts            # Drift-compensated playback synchronizer
│   │   └── webrtc.ts                 # P2P WebRTC mesh engine
│   ├── App.tsx                       # Main application router
│   ├── index.css                     # Dark cinematic styling & custom scrollbars
│   ├── main.tsx                      # Application entrypoint
│   └── vite-env.d.ts                 # Vite environment definitions
├── tests/
│   ├── capture.test.ts               # Media capture unit tests
│   ├── setup.ts                      # Test setup configuration
│   ├── sync.test.ts                  # Synchronization & jitter unit tests
│   └── webrtc.test.ts                # WebRTC engine unit tests
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Environment Configuration

Create a `.env` file in the project root:

```ini
# Client Variables (Exposed to Vite bundle)
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a97c0ed000188adaed0
VITE_APPWRITE_DATABASE_ID=syncine_db
VITE_MAX_PARTICIPANTS=4

# Server Provisioning & Function Execution (Private)
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a97c0ed000188adaed0
APPWRITE_DATABASE_ID=syncine_db
APPWRITE_API_KEY=your_appwrite_admin_api_key
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Provision Appwrite Backend
```bash
npm run setup:appwrite
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Test Suite
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
```

---

## Production Verification Runbook

1. **Anonymous Authentication:** Navigating to the application URL creates an anonymous session instantly without authentication screens.
2. **Safari Compatibility:** The host interface detects Safari and falls back to Local File Sync mode without crashing `getDisplayMedia`.
3. **DRM Protected Media:** Streaming Netflix/Prime from Chrome or Edge functions without black screens when hardware acceleration is disabled in browser settings.
4. **Touch-Action Isolation:** Dragging floating video boxes on iPadOS Safari or touch displays repositions tiles smoothly without scrolling or zooming the webpage.
5. **Ephemeral Cleanup:** The Appwrite cron function purges signaling documents older than 10 minutes to respect database quotas.
