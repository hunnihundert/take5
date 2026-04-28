# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planning Poker (Take5) - A real-time collaborative estimation tool for agile teams. Monorepo with React frontend and Node.js/Express backend communicating via Socket.io. Optional PostgreSQL persistence via Drizzle ORM. Docker-ready with multi-stage builds.

## Commands

```bash
# Development (runs both client and server with hot reload)
npm run dev

# Individual dev servers
npm run dev:client      # Vite dev server on port 3000
npm run dev:server      # tsx watch on port 3001

# Build for production
npm run build           # Builds shared, client, and server (in order)
npm run build:shared    # Build shared types only
npm run build:client    # Build client only
npm run build:server    # Build server only

# Start production server
npm start               # Runs server from dist/

# Tests
npm run test            # Run both client and server tests (vitest)
npm run test:server     # Run server tests
npm run test:client     # Run client tests
npm run test:e2e        # Run end-to-end tests (playwright)

# Database (requires DATABASE_URL)
npm run db:push --workspace=server      # Push schema directly
npm run db:generate --workspace=server  # Generate migrations
npm run db:migrate --workspace=server   # Run migrations
```

## Architecture

### Monorepo Structure

- **`/client`** - React 18 + Vite + Tailwind CSS frontend
- **`/server`** - Express + Socket.io backend with optional PostgreSQL (Drizzle ORM)
- **`/shared`** - Shared TypeScript types (`@taking5/shared`) - Player, Story, RoomState, JiraConfig, CardValue, DECK_PRESETS, DEFAULT_CARD_VALUES
- **`/e2e`** - Playwright end-to-end tests

### Real-time Communication

Socket.io handles all game state synchronization. Key event patterns:

**Client -> Server:** `createRoom`, `joinRoom`, `selectCard`, `revealCards`, `startNewRound`, `toggleObserver`, `updateAvatar`, `throwEmoji`, `transferModerator`, `leaveRoom`, `setDeckConfig`

**Client -> Server (Stories):** `addManualStory`, `removeStory`, `selectStory`, `applyStoryPoints`, `clearStories`

**Client -> Server (Jira):** `configureJira`, `disconnectJira`, `addStoryByLink`, `fetchJiraStories`, `refreshJiraStories`

**Server -> Client:** `sessionCreated`, `roomJoined`, `playerJoined`, `playerLeft`, `playerDisconnected`, `playerReconnected`, `cardSelected`, `cardsRevealed`, `newRound`, `observerToggled`, `avatarUpdated`, `emojiThrown`, `moderatorTransferred`, `deckConfigUpdated`, `error`

**Server -> Client (Stories):** `storyAdded`, `storiesUpdated`, `storySelected`, `storyPointsApplied`

**Server -> Client (Jira):** `jiraConfigured`, `jiraDisconnected`, `jiraError`

### State Management

- **Backend:** In-memory `Map<string, Room>` in `RoomManager` class. Optionally persists rooms/stories to PostgreSQL via Drizzle ORM (enabled when `DATABASE_URL` is set). `SessionManager` tracks session↔socket mappings and 60-second disconnect grace period timers.
- **Frontend:** React Context (`GameContext`) dispatching to specialized socket hooks (`useRoomSocket`, `useGameSocket`, `useStorySocket`, `useJiraSocket`). Includes 10-minute heartbeat for Render.com keep-alive. Player name and avatar persisted in `localStorage`.

### Key Files

**Server:**

- `server/src/index.ts` - Express server, Socket.io setup, session middleware, reconnection logic, health endpoint
- `server/src/sessionManager.ts` - Session tracking: session↔socket mapping, disconnect grace period timers
- `server/src/roomManager.ts` - Core game logic (room creation, player management, voting, DB hydration)
- `server/src/handlers/roomHandler.ts` - Room socket events (create, join, avatar, disconnect with grace period)
- `server/src/handlers/gameHandler.ts` - Game socket events (card select, reveal, new round, observer, emoji, deck config)
- `server/src/handlers/storyHandler.ts` - Story socket events (add, remove, select, apply points, clear)
- `server/src/handlers/jiraHandler.ts` - Jira socket events (configure, disconnect, import, fetch, refresh)
- `server/src/services/jiraService.ts` - Jira REST API integration (fetch issues, search, sync points)
- `server/src/db/schema.ts` - Drizzle schema (rooms + stories tables)
- `server/src/db/repository.ts` - Database query layer
- `server/src/db/index.ts` - Drizzle ORM initialization, `isDatabaseEnabled()` check
- `server/src/utils/logger.ts` - Console logger (dev-only)

**Client:**

- `client/src/context/GameContext.tsx` - Central state management via React Context
- `client/src/hooks/useSocket.ts` - Base Socket.io connection
- `client/src/hooks/useRoomSocket.ts` - Room lifecycle events
- `client/src/hooks/useGameSocket.ts` - Game mechanic events
- `client/src/hooks/useStorySocket.ts` - Story CRUD events
- `client/src/hooks/useJiraSocket.ts` - Jira integration events
- `client/src/components/GameRoom.tsx` - Main game interface
- `client/src/components/PokerTable.tsx` - Circular player layout with consensus detection and average display
- `client/src/components/CardDeck.tsx` - Card deck rendered from room's `cardValues`
- `client/src/components/DeckConfigModal.tsx` - Deck configuration modal (presets + custom tag input)
- `client/src/components/StoryList.tsx` - Story sidebar with Jira import
- `client/src/utils/linkRenderer.tsx` - Renders HTTP/HTTPS URLs as clickable links in story text
- `client/src/utils/confetti.ts` - Canvas-confetti wrapper for consensus celebrations

**Shared:**

- `shared/src/index.ts` - TypeScript interfaces (Player, Story, RoomState, JiraConfig, CardValue) + `DECK_PRESETS` and `DEFAULT_CARD_VALUES` constants

## Environment Variables

**Server:**

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - development/production
- `DATABASE_URL` - PostgreSQL connection string (optional; enables room/story persistence)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins

**Client:**

- `VITE_SOCKET_URL` - Socket.io server URL (defaults to localhost:3001 in dev, current origin in prod)

## Game-Specific Logic

- **Card values:** Configurable per room by the moderator. Default is Fibonacci (1, 2, 3, 5, 8, 13, 21). Built-in presets: Fibonacci, Extended Fibonacci, T-Shirt Sizes, Powers of 2. Custom decks: 1–20 values, max 8 chars each, no duplicates. `DECK_PRESETS` and `DEFAULT_CARD_VALUES` are exported from `@taking5/shared`. `CardValue` is `string` (widened from a literal union). Server validates submitted card values against the room's current deck in `selectCard`. Changing the deck via `setDeckConfig` calls `startNewRound` first if any votes exist, then broadcasts `newRound` + `deckConfigUpdated`. Non-numeric decks (e.g. T-Shirt) suppress the average display and apply-points dialog on the client.
- **Room codes:** 6-character uppercase alphanumeric (auto-generated), or custom 3-12 character codes
- **Moderator:** First player becomes moderator; auto-reassigns on disconnect (after grace period); can be manually transferred via right-click context menu (`transferModerator` event → `moderatorTransferred` broadcast)

- **Auto-reveal:** Cards reveal automatically when all non-observer players vote
- **Consensus:** Confetti animation triggers when all players select the same card
- **Name uniqueness:** Duplicate player names are rejected per room
- **Session identity:** `Player.id` is a server-generated UUID session ID (not socket.id); stored in client `localStorage` as `take5_sessionId`
- **Voluntary disconnect:** Client emits `leaveRoom` on `beforeunload`; server starts an 8-second grace period (`voluntaryDisconnectGraceMs`). Since `beforeunload` also fires on page reload, the short timer lets reloads reconnect before expiry while still removing the player promptly on a true tab close. The subsequent `disconnect` event skips the 60s involuntary timer when a voluntary timer is already running.
- **Grace period:** On involuntary disconnect (network drop, crash), player removal is delayed 60 seconds; reconnecting within that window restores full state seamlessly
- **Multi-tab:** Multiple tabs with the same session ID are treated as one player; each receives full state via `roomJoined`
- **Avatar/name persistence:** Stored in `localStorage` (`take5_avatarUrl`, `take5_playerName`); avatar auto-sent after joining, name pre-fills Home form
- **Jira Integration:** Stories can be imported via URL or JQL; story points sync back to Jira
- **Clickable links:** URLs in manual story summaries render as clickable links
- **Database persistence:** When DATABASE_URL is set, rooms and stories survive player disconnects and can be rehydrated

## Deployment

- **Docker:** Multi-stage Dockerfile (Node 20 Alpine). Builder compiles all workspaces; runner serves static client + Express backend on port 8080 with tini for signal handling.
- **Docker Compose:** `docker-compose.yml` orchestrates the app + a Postgres 16 container. Requires a `.env` file with `DB_USER` and `DB_PASSWORD`. Start with `docker compose up -d`. Schema is created automatically on first boot via `syncSchema()`.
- **Render.com:** Client includes a 10-minute heartbeat to `/api/health` to keep free-tier instances alive.
