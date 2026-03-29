# GEMINI.md

This file provides context and guidelines for Gemini CLI when working in this repository.

## Project Overview

**Planning Poker (Take5)** is a modern, real-time collaborative estimation tool for agile teams. It allows teams to vote on story points (Fibonacci: 1, 2, 3, 5, 8, 13) with features like Jira integration, observer mode, and interactive animations.

### Architecture
The project is a TypeScript monorepo using npm workspaces:
- **`client/`**: React 18 frontend built with Vite and styled with Tailwind CSS.
- **`server/`**: Node.js/Express backend using Socket.io for real-time synchronization and Drizzle ORM for PostgreSQL persistence (optional).
- **`shared/`**: Shared TypeScript types and interfaces (`@taking5/shared`).

### Communication & State Management
- **Real-time Communication**: WebSockets (Socket.io) handle all game state synchronization.
- **Backend Handlers**: Logic is modularized in `server/src/handlers/` (`roomHandler.ts`, `gameHandler.ts`, `storyHandler.ts`, `jiraHandler.ts`).
- **Backend State**: The `RoomManager` class handles room logic in-memory. If PostgreSQL is enabled, it uses `RoomRepository` for persistence.
- **Frontend State**: Managed via React Context (`GameContext.tsx`) and specialized hooks in `client/src/hooks/` (`useSocket`, `useRoomSocket`, `useGameSocket`, `useStorySocket`, `useJiraSocket`).

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

### Key Logic
- **Moderator**: The first player to create/join an empty room is the moderator.
- **Auto-reveal**: Cards reveal automatically when all non-observers have voted.
- **Jira**: Issue keys and URLs are parsed from input or JQL queries. Story points can be synced back if configured.
