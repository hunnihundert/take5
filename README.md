# Planning Poker Web Application

A modern, real-time Planning Poker application for agile teams, built with React, TypeScript, Node.js, and Socket.io. Optional PostgreSQL persistence via Drizzle ORM. Docker-ready.

## Features

### Jira Integration
- **Jira Connection** - Connect your room to your Jira instance
- **Story Import via Link** - Add Jira issues by pasting the link
- **JQL Import** - Import multiple stories using JQL queries
- **Story Points Sync** - Write estimated story points back to Jira
- **Manual Stories** - Add stories without Jira too
- **Active Story Banner** - Banner shows the story currently being estimated
- **Progress Tracking** - Overview of estimated vs. open stories
- **Clickable Links** - URLs in story descriptions are rendered as clickable links

### Core Features
- **Real-time Sync** - All players see live updates via Socket.io
- **Compact Card Deck** - Values: 1, 2, 3, 5, 8, 13 (Fibonacci-based)
- **Custom Room Codes** - Create rooms with a custom code (3-12 chars) or auto-generated (6 chars)
- **Emoji Throwing** - Right-click a player to throw emojis (arc animation with bounce effect)
- **Player Avatars** - Upload and crop your own profile picture
- **Poker Table** - Players arranged in a circle around a virtual poker table
- **Subtle Highlight** - Selected card shown with a soft blue background and ring
- **Hidden Cards** - Selected cards shown as face-down until revealed
- **Smooth Animations** - Flip animation when cards are revealed
- **Observer Mode** - Watch without participating in voting
- **No Duplicate Names** - Server-side validation prevents name conflicts
- **Moderator Controls** - Room creator can reveal cards, start new rounds, and transfer moderator role
- **Moderator Transfer** - Right-click any player to hand over the moderator role
- **Auto Average** - Instant result calculation after reveal
- **Auto Reveal** - Cards automatically reveal when all active players have voted
- **Confetti on Consensus** - Celebration animation when everyone agrees
- **Shareable Links** - Direct room links with URL parameters
- **Copy Link** - One-click link copying for easy sharing

### Persistence (optional)
- **PostgreSQL Database** - Rooms and stories survive player disconnects
- **Auto Hydration** - Empty rooms reload from the database when players rejoin
- **Without Database** - Works entirely in-memory (rooms are ephemeral)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Socket.io Client** for real-time communication
- **Canvas Confetti** for confetti animations
- **React Context** (GameContext) for state management

### Backend
- **Node.js** with Express
- **Socket.io** for WebSocket connections
- **TypeScript** for type safety
- **Drizzle ORM** + **PostgreSQL** for optional persistence
- **In-Memory Storage** as fallback (no database required)

### Shared
- **@taking5/shared** - Shared TypeScript types (Player, Story, RoomState, JiraConfig, CardValue)

### Testing
- **Vitest** for unit and integration tests (client + server)
- **React Testing Library** for hook tests
- **Playwright** for end-to-end tests
- **pg-mem** for database tests without a real PostgreSQL instance

## Project Structure

```
take5/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Home.tsx                 # Landing page (create/join room)
│   │   │   ├── GameRoom.tsx             # Main game room
│   │   │   ├── PokerTable.tsx           # Poker table (circular layout)
│   │   │   ├── CardDeck.tsx             # Card deck (1,2,3,5,8,13)
│   │   │   ├── PlayerList.tsx           # Player list with avatars
│   │   │   ├── Results.tsx              # Results display with average
│   │   │   ├── AvatarEditor.tsx         # Avatar cropping tool
│   │   │   ├── PlayerContextMenu.tsx    # Right-click context menu
│   │   │   ├── EmojiPicker.tsx          # Emoji picker (9 categories)
│   │   │   ├── FlyingEmoji.tsx          # Flying emoji animation
│   │   │   ├── StoryList.tsx            # Story sidebar with import
│   │   │   ├── ActiveStoryBanner.tsx    # Active story display
│   │   │   ├── JiraConfigModal.tsx      # Jira configuration
│   │   │   ├── JqlImportSection.tsx     # JQL import
│   │   │   └── ApplyPointsDialog.tsx    # Apply story points dialog
│   │   ├── context/
│   │   │   └── GameContext.tsx           # Central state management
│   │   ├── hooks/                       # Custom React hooks
│   │   │   ├── useSocket.ts             # Base Socket.io connection
│   │   │   ├── useRoomSocket.ts         # Room lifecycle events
│   │   │   ├── useGameSocket.ts         # Game mechanic events
│   │   │   ├── useStorySocket.ts        # Story CRUD events
│   │   │   └── useJiraSocket.ts         # Jira integration events
│   │   ├── utils/
│   │   │   ├── confetti.ts              # Confetti animation
│   │   │   └── linkRenderer.tsx         # Clickable URLs in stories
│   │   ├── types/
│   │   │   └── index.ts                 # Re-exports from shared
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── server/                      # Node.js Backend
│   ├── src/
│   │   ├── handlers/                    # Socket event handlers
│   │   │   ├── roomHandler.ts           # Room events (create, join, avatar, disconnect)
│   │   │   ├── gameHandler.ts           # Game events (select, reveal, round, observer, emoji)
│   │   │   ├── storyHandler.ts          # Story events (add, remove, select, apply, clear)
│   │   │   ├── jiraHandler.ts           # Jira events (configure, import, fetch, refresh)
│   │   │   └── types.ts                 # Handler type definitions
│   │   ├── services/
│   │   │   └── jiraService.ts           # Jira REST API integration
│   │   ├── db/                          # Database layer (optional)
│   │   │   ├── index.ts                 # Drizzle ORM setup, isDatabaseEnabled()
│   │   │   ├── schema.ts               # Tables: rooms, stories
│   │   │   └── repository.ts           # Query functions
│   │   ├── utils/
│   │   │   └── logger.ts               # Console logger (development only)
│   │   ├── index.ts                     # Server entry point
│   │   ├── roomManager.ts              # Room management + DB hydration
│   │   └── types.ts                     # Socket event type definitions
│   ├── package.json
│   └── tsconfig.json
├── shared/                      # Shared TypeScript types
│   ├── src/
│   │   └── index.ts                     # Player, Story, RoomState, JiraConfig, CardValue
│   └── package.json
├── e2e/                         # End-to-end tests
│   └── voting.spec.ts                  # Multi-player voting workflow
├── Dockerfile                   # Multi-stage Docker build (Node 20 Alpine)
├── .dockerignore
├── .env.example                 # Example environment variables
├── playwright.config.ts         # Playwright configuration
├── CLAUDE.md                    # Claude Code instructions
├── GEMINI.md                    # Gemini instructions
└── package.json                 # Root package (workspaces)
```

## Installation

### Prerequisites
- Node.js (version 18 or higher)
- npm
- PostgreSQL (optional, for room persistence)

### Step 1: Clone or download the repository

```bash
cd take5
```

### Step 2: Install dependencies

```bash
npm install
```

This installs all dependencies for frontend, backend, and shared package via npm workspaces.

### Step 3: Environment variables (optional)

```bash
cp .env.example .env
```

Configurable variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment |
| `DATABASE_URL` | _(empty)_ | PostgreSQL connection string (optional) |
| `ALLOWED_ORIGINS` | _(auto)_ | Comma-separated CORS origins |
| `VITE_SOCKET_URL` | _(auto)_ | Socket.io server URL (client) |

## Development

### Start both servers simultaneously (recommended)

```bash
npm run dev
```

This starts:
- Backend server at `http://localhost:3001`
- Frontend dev server at `http://localhost:3000`

### Start individually

**Backend only:**
```bash
npm run dev:server
```

**Frontend only:**
```bash
npm run dev:client
```

## Tests

### Run all unit & integration tests

```bash
npm run test
```

### Server tests
```bash
npm run test:server
```
Uses **Vitest**. Tests room management, socket handlers, Jira integration, and the database repository (with pg-mem).

### Client tests
```bash
npm run test:client
```
Uses **Vitest** and **React Testing Library**. Tests hooks and context providers.

### E2E tests
```bash
npm run test:e2e
```
Uses **Playwright**. Tests the multi-player voting workflow in real browsers (create room, add story, vote, reveal, new round).

## Production

### Build

```bash
npm run build
```

Builds all three packages (shared -> client -> server) in the correct order.

### Start server

```bash
npm start
```

The server serves the built client files as static assets.

### Docker

```bash
docker build -t take5 .
docker run -p 8080:8080 take5
```

The multi-stage build (Node 20 Alpine) compiles all workspaces and starts the server on port 8080 with tini for signal handling.

With PostgreSQL persistence:
```bash
docker run -p 8080:8080 -e DATABASE_URL=postgresql://user:pw@host:5432/db take5
```

### Database setup (optional)

To use PostgreSQL:

```bash
# Push schema directly (recommended for quick updates)
npm run db:push --workspace=server

# OR generate and apply migrations
npm run db:generate --workspace=server
npm run db:migrate --workspace=server
```

## Usage

### 1. Create a room
1. Open the app in your browser (`http://localhost:3000`)
2. Click "Create New Room"
3. Enter your name
4. Optionally enter a custom room code (3-12 chars) or leave blank for auto-generated (6 chars)
5. Share the code with your team

### 2. Join a room
1. Click "Join Room"
2. Enter your name and the room code
3. Click "Join"

**Or with a direct link:**
1. Open a shared link (e.g. `http://localhost:3000?room=ABC123`)
2. Enter only your name (room code is pre-filled)
3. Click "Join"

### 3. Share the room
- **Copy Link button**: Click "Copy Link" next to the room code inside the game room
- The link is copied to your clipboard
- Share the link with your team via email, chat, etc.

### 4. Playing
- **Select a card**: Click one of the cards in the deck
- **Wait**: All players see who has already voted (face-down card indicator)
- **Auto reveal**: Cards reveal automatically when all active players have voted
- **Manual reveal**: The moderator can click "Reveal Cards" at any time
- **Results**: After reveal, see all chosen cards and the average
- **Consensus celebration**: Confetti appears when everyone picks the same card
- **Apply story points**: Dialog suggests the consensus value or nearest Fibonacci to the average
- **New round**: The moderator starts a new round

### 5. Observer mode
- **Enable**: Click "Observer Mode" in the header
- **Disable**: Click "Participate" to rejoin voting
- Observers cannot select cards and do not count toward auto-reveal

### 6. Change avatar
- **Upload**: Click your avatar in the header and select an image
- **Crop**: Adjust the crop area in the editor
- **Remove**: Hover over the avatar and click the X icon

### 7. Throw emojis
- **Open**: Right-click another player at the poker table
- **Select**: Click "Throw Emoji" in the context menu
- **Throw**: Choose an emoji from the picker (9 categories)
- **Categories**: Funny, Numbers, Faces, Gestures, Hearts, Objects, Food, Animals, Nature
- **Recently used**: Your last 5 thrown emojis appear at the top

### 8. Transfer moderator role (Moderator only)
- **Open**: Right-click another player at the poker table
- **Select**: Click "Make Moderator" (👑) in the context menu
- The selected player immediately becomes the new moderator
- The previous moderator loses all moderator privileges

### 9. Jira Integration (Moderator)

#### Connect Jira
1. Click the Jira icon in the story list
2. Enter your Jira instance URL (e.g. `https://your-team.atlassian.net`)
3. Enter your email address
4. Create an API token at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
5. Optionally enter the Story Points field ID (e.g. `customfield_10016`)
6. Click "Connect"

#### Import stories
- **Via link**: Paste a Jira issue URL and press Enter
- **Via JQL**: Advanced search with JQL queries (e.g. `sprint in openSprints()`)
- **Manually**: Enter a description (URLs are rendered as clickable links)

#### Apply story points
1. A dialog appears after cards are revealed
2. The consensus value is suggested automatically when all players agree
3. Click "Apply" (saves locally and optionally syncs to Jira)

## Game Rules

### Moderator
- The first player to create a room becomes moderator automatically
- If the moderator leaves, a new moderator is assigned automatically
- The moderator can transfer the role to any other player by right-clicking them and selecting "Make Moderator"
- Only the moderator can:
  - Reveal cards early
  - Start new rounds
  - Manage stories
  - Configure Jira
  - Transfer the moderator role

### Card values
Fibonacci sequence: **1, 2, 3, 5, 8, 13**

### Voting
- Each player selects exactly one card
- Other players only see that you have voted (not which card)
- Cards are revealed simultaneously when:
  - ALL active players have voted (automatic), OR
  - The moderator clicks "Reveal Cards" (manual)

## API Reference

### Socket.io Events

#### Client -> Server
- `createRoom(playerName, roomCode?, callback)` - Create a new room (optional custom code)
- `joinRoom({ roomCode, playerName }, callback)` - Join a room
- `selectCard(cardValue)` - Select a card
- `revealCards()` - Reveal cards (moderator only)
- `startNewRound()` - Start a new round (moderator only)
- `toggleObserver()` - Toggle observer mode
- `updateAvatar(avatarUrl)` - Update avatar (Base64 or null)
- `throwEmoji({ toPlayerId, emoji })` - Throw an emoji at a player
- `transferModerator({ toPlayerId })` - Transfer moderator role to another player (moderator only)

**Story events (moderator only):**
- `addManualStory(summary)` - Add a manual story
- `removeStory(storyId)` - Remove a story
- `selectStory(storyId)` - Select a story for estimation
- `applyStoryPoints({ storyId, points })` - Apply story points
- `clearStories()` - Clear all stories

**Jira events (moderator only):**
- `configureJira({ baseUrl, email, apiToken, storyPointsFieldId? })` - Connect Jira
- `disconnectJira()` - Disconnect Jira
- `addStoryByLink(url)` - Import a story via Jira link
- `fetchJiraStories(jql)` - Import stories via JQL
- `refreshJiraStories()` - Refresh Jira stories

#### Server -> Client
- `roomJoined({ roomCode, player, players, stories, activeStoryId, jiraConnected })` - Successfully joined
- `playerJoined(player)` - A new player joined
- `playerLeft({ playerId, newModeratorId? })` - A player left
- `cardSelected({ playerId, hasVoted })` - A player selected a card
- `cardsRevealed(players)` - Cards were revealed
- `newRound()` - A new round started
- `observerToggled({ playerId, isObserver })` - Observer status changed
- `avatarUpdated({ playerId, avatarUrl })` - Avatar updated
- `emojiThrown({ fromPlayerId, toPlayerId, emoji })` - Emoji thrown
- `moderatorTransferred({ fromPlayerId, toPlayerId })` - Moderator role transferred
- `error(message)` - An error occurred

**Story events:**
- `storyAdded(story)` - A story was added
- `storiesUpdated(stories)` - Story list updated
- `storySelected({ storyId, story })` - A story was selected
- `storyPointsApplied({ storyId, points })` - Story points applied

**Jira events:**
- `jiraConfigured({ baseUrl })` - Jira connected
- `jiraDisconnected()` - Jira disconnected
- `jiraError({ code, message })` - Jira error occurred

## Troubleshooting

### Port already in use
**Frontend** - Change in `client/vite.config.ts`:
```typescript
server: {
  port: 3002, // new port
}
```

**Backend** - Set environment variable:
```bash
PORT=3003 npm run dev:server
```

### Connection issues
- Make sure both servers are running
- Check the browser console for errors
- Ensure no firewall is blocking the connection

### Build errors
```bash
# Reinstall dependencies
rm -rf node_modules client/node_modules server/node_modules shared/node_modules
npm install
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and intended for educational purposes.
