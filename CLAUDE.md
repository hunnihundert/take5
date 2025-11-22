# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planning Poker (Take5) - A real-time collaborative estimation tool for agile teams. Monorepo with React frontend and Node.js/Express backend communicating via Socket.io.

## Commands

```bash
# Development (runs both client and server with hot reload)
npm run dev

# Individual dev servers
npm run dev:client      # Vite dev server on port 3000
npm run dev:server      # tsx watch on port 3001

# Build for production
npm run build           # Builds both client and server

# Start production server
npm start               # Runs server from dist/
```

## Architecture

### Monorepo Structure
- **`/client`** - React 18 + Vite + Tailwind CSS frontend
- **`/server`** - Express + Socket.io backend

### Real-time Communication
Socket.io handles all game state synchronization. Key event patterns:

**Client → Server:** `createRoom`, `joinRoom`, `selectCard`, `revealCards`, `startNewRound`, `toggleObserver`, `updateAvatar`

**Server → Client:** `roomJoined`, `playerJoined`, `playerLeft`, `cardSelected`, `cardsRevealed`, `newRound`, `observerToggled`, `avatarUpdated`, `error`

### State Management
- **Backend:** In-memory `Map<string, Room>` in `RoomManager` class - no database, all state is ephemeral
- **Frontend:** React hooks with `useSocket` custom hook for Socket.io connection

### Key Files
- `server/src/roomManager.ts` - Core game logic (room creation, player management, voting)
- `server/src/index.ts` - Express server and Socket.io event handlers
- `client/src/hooks/useSocket.ts` - Socket connection management
- `client/src/components/GameRoom.tsx` - Main game interface

## Environment Variables

**Server:**
- `PORT` - Server port (default: 3001)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins
- `NODE_ENV` - development/production

**Client:**
- `VITE_SOCKET_URL` - Socket.io server URL (defaults to localhost:3001 in dev, origin in prod)

## Game-Specific Logic

- **Card values:** Fibonacci sequence (1, 2, 3, 5, 8, 13)
- **Room codes:** 6-character uppercase alphanumeric
- **Moderator:** First player becomes moderator; auto-reassigns on disconnect
- **Auto-reveal:** Cards reveal automatically when all non-observer players vote
- **Consensus:** Confetti animation triggers when all players select the same card
