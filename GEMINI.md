# GEMINI.md

This file provides context and guidelines for Gemini CLI when working in this repository.

## Project Overview

**Planning Poker (Take5)** is a modern, real-time collaborative estimation tool for agile teams. It allows teams to vote on story points using a configurable card deck (default Fibonacci: 1, 2, 3, 5, 8, 13, 21) with features like Jira integration, observer mode, and interactive animations.

### Architecture
The project is a TypeScript monorepo using npm workspaces:
- **`client/`**: React 18 frontend built with Vite and styled with Tailwind CSS.
- **`server/`**: Node.js/Express backend using Socket.io for real-time synchronization and Drizzle ORM for PostgreSQL persistence (optional).
- **`shared/`**: Shared TypeScript types and interfaces (`@taking5/shared`) including `DECK_PRESETS` and `DEFAULT_CARD_VALUES`.

### Communication & State Management
- **Real-time Communication**: WebSockets (Socket.io) handle all game state synchronization.
- **Backend Handlers**: Logic is modularized in `server/src/handlers/` (`roomHandler.ts`, `gameHandler.ts`, `storyHandler.ts`, `jiraHandler.ts`).
- **Backend State**: The `RoomManager` class handles room logic in-memory. If PostgreSQL is enabled, it uses `RoomRepository` for persistence.
- **Frontend State**: Managed via React Context (`GameContext.tsx`) and specialized hooks in `client/src/hooks/` (`useSocket`, `useRoomSocket`, `useGameSocket`, `useStorySocket`, `useJiraSocket`). `RoomState` includes `cardValues: string[]` which drives the card deck UI.

## Building and Running

### Development
Start both frontend and backend in development mode:
```bash
npm run dev
```
Individual components:
- **Frontend (Port 3000)**: `npm run dev:client`
- **Backend (Port 3001)**: `npm run dev:server`

### Production
Build both projects:
```bash
npm run build
```
Start the production server (serves both API and static frontend):
```bash
npm start
```

### Database (Optional)
If `DATABASE_URL` is provided in `.env`, the server uses PostgreSQL. Otherwise, it falls back to in-memory storage (ephemeral).

> **Important**: When the database schema changes (e.g., room code length expansion), you MUST apply the changes to the database as part of your deployment process.

- **Generate Migrations**: `npm run db:generate --workspace=server`
- **Apply Migrations**: `npm run db:migrate --workspace=server`
- **Push Schema (Quick Update)**: `npm run db:push --workspace=server`

### Testing
- **All Unit & Integration Tests**: `npm run test`
- **Server Tests**: `npm run test:server` (Vitest)
- **Client Tests**: `npm run test:client` (Vitest + React Testing Library)
- **E2E Tests**: `npm run test:e2e` (Playwright)

## Development Conventions

### Code Structure
- **React Components**: Located in `client/src/components/`. Use functional components and hooks.
- **Socket Handlers**: Backend logic is modularized in `server/src/handlers/` (e.g., `gameHandler.ts`, `roomHandler.ts`).
- **Shared Types**: Always define common interfaces (Players, Stories, RoomState) in `shared/src/index.ts`.

### Real-time Event Patterns
- **Client → Server**: Commands to change state (e.g., `selectCard`, `revealCards`).
- **Server → Client**: State updates (e.g., `playerJoined`, `cardsRevealed`).
- Refer to `CLAUDE.md` or `server/src/types.ts` for the full list of events.

### Session Management
- **Session Identity (`Player.id`)**: Represents a server-generated UUID stored in client `localStorage` (as `take5_sessionId`), not the transient `socket.id`.
- **Voluntary Disconnect**: The client emits a `leaveRoom` event on `beforeunload`. The server starts a short 8-second grace period (instead of immediately removing or using the full 60s). This allows page reloads to reconnect seamlessly — the browser fires `beforeunload` on reload too, so the shorter timer ensures the player is restored if they reconnect quickly, while still removing them promptly on a true tab close.
- **Grace Period**: The `SessionManager` implements a 60-second disconnect timeout for involuntary disconnects (network drop, crash). Reconnecting within this window flawlessly restores state and avoids "player left/joined" unneeded broadcasts to others.
- **Multi-Tab Support**: Multiple tabs sharing the same `sessionId` sync seamlessly and represent the same physical user. Closing one tab does not remove the player as long as other tabs remain open.
- **Persistent Preferences**: Player names and avatars (`take5_playerName`, `take5_avatarUrl`) are stored locally and automatically prefilled.

### Key Logic
- **Moderator**: The first player to create/join a room is given moderator rights. The role is automatically shifted to someone else if they fully leave. Alternatively, a moderator can explicitly transfer power via right-click menu.
- **Card Deck Configuration**: The moderator can change the card deck at any time via the **Deck** button in moderator controls. Built-in presets are `fibonacci` (default: 1 2 3 5 8 13 21), `modFibonacci`, `tshirt`, and `powersOf2`, all defined in `DECK_PRESETS` in `shared/src/index.ts`. Custom decks allow 1–20 values (max 8 chars each). Changing the deck while votes are active triggers `startNewRound` first, then broadcasts `newRound` + `deckConfigUpdated`. Non-numeric decks suppress the average and apply-points dialog. `CardValue` is `string` — the server validates incoming `selectCard` values against `room.cardValues`.
- **Voting & Auto-Reveal**: Selected cards remain hidden. The deck auto-reveals when all active (non-observing) players have voted. Observers do not vote and bypass this criteria.
- **Consensus & Celebration**: If all participants pick the identical card, a confetti animation executes. Embellishments like throwing emojis to a specific player are supported in real-time via right-click.
- **Jira**: Users can configure basic auth (`apiToken`) to connect their Jira accounts. Issue keys and URLs are parsed for importing via direct links or JQL. Story points can be synchronized back to Jira once estimated.

### Deployment & Environment
- **Docker**: Equipped with a multi-stage `Dockerfile` (Node 20 Alpine) to compile workspaces and launch the static server on port 8080.
- **Docker Compose**: `docker-compose.yml` orchestrates the app + Postgres 16 together. Copy `.env.example` to `.env`, set `DB_USER` and `DB_PASSWORD`, then run `docker compose up -d`. Schema is created automatically on first boot.
- **Keep-alive**: The frontend utilizes a repetitive 10-minute heartbeat polling `/api/health` to deter free-tier PaaS (like Render.com) from suspending during gameplay.
