import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './roomManager';
import { ServerToClientEvents, ClientToServerEvents, CardValue, JiraConfig } from './types';
import { JiraService } from './services/jiraService';

const app = express();
const httpServer = createServer(app);

// CORS configuration for production and development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Serve static files from the React app in production
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const roomManager = new RoomManager();
const socketToRoom = new Map<string, string>();

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', (playerName: string, callback) => {
    try {
      const { room, player } = roomManager.createRoom(playerName, socket.id);
      socketToRoom.set(socket.id, room.code);

      socket.join(room.code);

      callback({ success: true, roomCode: room.code });
      socket.emit('roomJoined', {
        roomCode: room.code,
        player,
        players: roomManager.getPlayersArray(room),
        stories: room.stories,
        activeStoryId: room.activeStoryId,
        jiraConnected: room.jiraConfig !== undefined
      });

      console.log(`Room created: ${room.code} by ${playerName}`);
    } catch (error) {
      callback({ success: false, error: 'Fehler beim Erstellen des Raums' });
    }
  });

  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    try {
      const result = roomManager.joinRoom(roomCode, playerName, socket.id);

      if (!result) {
        callback({ success: false, error: 'Raum nicht gefunden' });
        return;
      }

      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }

      const { room, player } = result;
      socketToRoom.set(socket.id, room.code);

      socket.join(room.code);

      callback({ success: true });

      // Notify new player
      socket.emit('roomJoined', {
        roomCode: room.code,
        player,
        players: roomManager.getPlayersArray(room),
        stories: room.stories,
        activeStoryId: room.activeStoryId,
        jiraConnected: room.jiraConfig !== undefined
      });

      // Notify other players
      socket.to(room.code).emit('playerJoined', player);

      console.log(`${playerName} joined room ${room.code}`);
    } catch (error) {
      callback({ success: false, error: 'Fehler beim Beitreten' });
    }
  });

  socket.on('selectCard', (cardValue: CardValue) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || player.isObserver) return; // Observers cannot select cards

    const success = roomManager.selectCard(roomCode, socket.id, cardValue);
    if (!success) return;

    // Notify all players that someone voted
    io.to(roomCode).emit('cardSelected', {
      playerId: socket.id,
      hasVoted: player.hasVoted
    });

    // Auto-reveal if all players voted
    if (roomManager.allPlayersVoted(roomCode)) {
      const revealedRoom = roomManager.revealCards(roomCode);
      if (revealedRoom) {
        io.to(roomCode).emit('cardsRevealed', roomManager.getPlayersArray(revealedRoom));
      }
    }
  });

  socket.on('toggleObserver', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const player = roomManager.toggleObserver(roomCode, socket.id);
    if (!player) return;

    // Notify all players about observer status change
    io.to(roomCode).emit('observerToggled', {
      playerId: socket.id,
      isObserver: player.isObserver
    });
  });

  socket.on('updateAvatar', (avatarUrl: string | null) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const player = roomManager.updateAvatar(roomCode, socket.id, avatarUrl);
    if (!player) return;

    // Notify all players about avatar change
    io.to(roomCode).emit('avatarUpdated', {
      playerId: socket.id,
      avatarUrl: player.avatarUrl
    });
  });

  socket.on('throwEmoji', ({ toPlayerId, emoji }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Verify target player exists in the room
    if (!room.players.has(toPlayerId)) return;

    // Broadcast emoji throw to all players in the room
    io.to(roomCode).emit('emojiThrown', {
      fromPlayerId: socket.id,
      toPlayerId,
      emoji
    });
  });

  socket.on('revealCards', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || !player.isModerator) return;

    const revealedRoom = roomManager.revealCards(roomCode);
    if (revealedRoom) {
      io.to(roomCode).emit('cardsRevealed', roomManager.getPlayersArray(revealedRoom));
    }
  });

  socket.on('startNewRound', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || !player.isModerator) return;

    const resetRoom = roomManager.startNewRound(roomCode);
    if (resetRoom) {
      io.to(roomCode).emit('newRound');
    }
  });

  // Story management events (Phase 1)

  socket.on('addManualStory', (summary: string) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    // Verify moderator
    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories hinzufügen');
      return;
    }

    const story = roomManager.addManualStory(roomCode, summary);
    if (story) {
      io.to(roomCode).emit('storyAdded', story);
    }
  });

  socket.on('removeStory', (storyId: string) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories entfernen');
      return;
    }

    const success = roomManager.removeStory(roomCode, storyId);
    if (success) {
      io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));
    }
  });

  socket.on('selectStory', (storyId: string | null) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories auswählen');
      return;
    }

    const story = roomManager.selectStory(roomCode, storyId);
    io.to(roomCode).emit('storySelected', { storyId: storyId || '', story });
  });

  socket.on('applyStoryPoints', ({ storyId, points }: { storyId: string; points: number }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Story Points vergeben');
      return;
    }

    const story = roomManager.applyStoryPoints(roomCode, storyId, points);
    if (story) {
      io.to(roomCode).emit('storyPointsApplied', { storyId, points });
    }
  });

  socket.on('clearStories', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories löschen');
      return;
    }

    roomManager.clearStories(roomCode);
    io.to(roomCode).emit('storiesUpdated', []);
  });

  // Jira integration events (Phase 2)

  socket.on('configureJira', async (config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Jira konfigurieren');
      return;
    }

    // Test the connection first
    const testResult = await JiraService.testConnection(config);
    if (!testResult.success) {
      socket.emit('jiraError', { code: 'CONNECTION_FAILED', message: testResult.error || 'Verbindung fehlgeschlagen' });
      return;
    }

    // Store the config
    roomManager.setJiraConfig(roomCode, config);
    io.to(roomCode).emit('jiraConfigured', { baseUrl: config.baseUrl });
    console.log(`Jira configured for room ${roomCode}: ${config.baseUrl}`);
  });

  socket.on('disconnectJira', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Jira trennen');
      return;
    }

    roomManager.clearJiraConfig(roomCode);
    io.to(roomCode).emit('jiraDisconnected');
    console.log(`Jira disconnected for room ${roomCode}`);
  });

  socket.on('addStoryByLink', async (url: string) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories hinzufügen');
      return;
    }

    // Parse the URL
    const parsed = JiraService.parseJiraUrl(url);
    if (!parsed) {
      socket.emit('jiraError', { code: 'INVALID_URL', message: 'Ungültige Jira-URL' });
      return;
    }

    // Check if Jira is configured
    const jiraConfig = roomManager.getJiraConfig(roomCode);
    if (!jiraConfig) {
      // Return info to configure Jira with detected base URL
      socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: `Jira nicht konfiguriert. Erkannte URL: ${parsed.baseUrl}` });
      return;
    }

    // Validate same Jira instance
    if (jiraConfig.baseUrl !== parsed.baseUrl) {
      socket.emit('jiraError', { code: 'INSTANCE_MISMATCH', message: `Falsche Jira-Instanz. Erwartet: ${jiraConfig.baseUrl}` });
      return;
    }

    // Fetch the issue
    const result = await JiraService.fetchIssue(jiraConfig, parsed.issueKey);
    if (!result.story) {
      socket.emit('jiraError', { code: 'FETCH_FAILED', message: result.error || 'Issue konnte nicht abgerufen werden' });
      return;
    }

    // Add to room (checks for duplicates)
    const addedStory = roomManager.addJiraStory(roomCode, result.story);
    if (!addedStory) {
      socket.emit('jiraError', { code: 'DUPLICATE', message: `Story ${parsed.issueKey} ist bereits vorhanden` });
      return;
    }

    io.to(roomCode).emit('storyAdded', addedStory);
  });

  socket.on('fetchJiraStories', async (jql: string) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories importieren');
      return;
    }

    const jiraConfig = roomManager.getJiraConfig(roomCode);
    if (!jiraConfig) {
      socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: 'Jira nicht konfiguriert' });
      return;
    }

    const result = await JiraService.searchIssues(jiraConfig, jql);
    if (result.error) {
      socket.emit('jiraError', { code: 'SEARCH_FAILED', message: result.error });
      return;
    }

    // Add all fetched stories
    let addedCount = 0;
    for (const storyData of result.stories) {
      const addedStory = roomManager.addJiraStory(roomCode, storyData);
      if (addedStory) {
        addedCount++;
      }
    }

    // Broadcast updated stories list
    io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));

    if (addedCount === 0 && result.stories.length > 0) {
      socket.emit('jiraError', { code: 'ALL_DUPLICATES', message: 'Alle gefundenen Stories sind bereits vorhanden' });
    }
  });

  socket.on('refreshJiraStories', async () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    if (!roomManager.isModerator(roomCode, socket.id)) {
      socket.emit('error', 'Nur der Moderator kann Stories aktualisieren');
      return;
    }

    const jiraConfig = roomManager.getJiraConfig(roomCode);
    if (!jiraConfig) {
      socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: 'Jira nicht konfiguriert' });
      return;
    }

    // Refresh existing Jira stories
    const stories = roomManager.getStories(roomCode);
    const jiraStories = stories.filter(s => !s.isManual && s.key);

    for (const story of jiraStories) {
      const result = await JiraService.fetchIssue(jiraConfig, story.key!);
      if (result.story) {
        // Update story points if changed
        if (result.story.storyPoints !== undefined && result.story.storyPoints !== story.storyPoints) {
          roomManager.applyStoryPoints(roomCode, story.id, result.story.storyPoints);
        }
      }
    }

    io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));
  });

  socket.on('disconnect', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      roomManager.removePlayer(roomCode, socket.id);
      socket.to(roomCode).emit('playerLeft', socket.id);
      socketToRoom.delete(socket.id);
      console.log(`Player ${socket.id} left room ${roomCode}`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Catch-all route to serve React app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
