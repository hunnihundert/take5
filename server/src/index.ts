import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './roomManager';
import { SessionManager } from './sessionManager';
import { ServerToClientEvents, ClientToServerEvents } from './types';
import { roomHandler } from './handlers/roomHandler';
import { gameHandler } from './handlers/gameHandler';
import { storyHandler } from './handlers/storyHandler';
import { jiraHandler } from './handlers/jiraHandler';
import { initDatabase, isDatabaseEnabled, syncSchema } from './db';
import { RoomRepository } from './db/repository';
import { logger } from './utils/logger';

export async function createServerApp(options?: { disconnectGraceMs?: number }) {
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
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isDatabaseEnabled() ? 'connected' : 'disabled'
    });
  });

  // Initialize database connection
  await initDatabase();

  // Ensure database tables exist
  await syncSchema();

  // Create repository if database is enabled
  const repository = isDatabaseEnabled() ? new RoomRepository() : undefined;

  // Create room manager with optional repository
  const roomManager = new RoomManager(repository);
  const sessionManager = new SessionManager(options?.disconnectGraceMs);

  // Session middleware: assign or validate session ID before connection handler
  io.use((socket, next) => {
    const providedSessionId = socket.handshake.auth?.sessionId as string | undefined;

    if (providedSessionId && sessionManager.isKnownSession(providedSessionId)) {
      socket.data.sessionId = providedSessionId;
      socket.data.isNewSession = false;
    } else {
      const newSessionId = sessionManager.generateSessionId();
      sessionManager.createSession(newSessionId);
      socket.data.sessionId = newSessionId;
      socket.data.isNewSession = true;
    }

    next();
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const sessionId = socket.data.sessionId as string;
    const isNewSession = socket.data.isNewSession as boolean;

    sessionManager.registerSocket(sessionId, socket.id);

    // Emit session ID to new sessions so client can store it
    if (isNewSession) {
      socket.emit('sessionCreated', { sessionId });
    }

    // Handle reconnection: if session has an active room, rejoin automatically
    const sessionInfo = sessionManager.getSessionInfo(sessionId);
    if (sessionInfo?.roomCode) {
      const wasDisconnected = sessionManager.cancelDisconnectTimer(sessionId);
      const room = roomManager.getRoom(sessionInfo.roomCode);

      if (room && room.players.has(sessionId)) {
        socket.join(sessionInfo.roomCode);

        // Send full state to the reconnected/new-tab socket
        const player = room.players.get(sessionId)!;
        socket.emit('roomJoined', {
          roomCode: sessionInfo.roomCode,
          player,
          players: roomManager.getPlayersArray(room),
          stories: room.stories,
          activeStoryId: room.activeStoryId ?? null,
          jiraConnected: room.jiraConfig !== undefined,
        });

        if (wasDisconnected) {
          // Notify others the player is back
          socket.to(sessionInfo.roomCode).emit('playerReconnected', { playerId: sessionId });
          logger.info(`Session ${sessionId} reconnected to room ${sessionInfo.roomCode}`);
        }
      } else {
        // Room or player no longer exists — clear stale session room
        sessionManager.clearSessionRoom(sessionId);
      }
    }

    // Register all handlers
    roomHandler(io, socket, roomManager, sessionManager);
    gameHandler(io, socket, roomManager, sessionManager);
    storyHandler(io, socket, roomManager, sessionManager);
    jiraHandler(io, socket, roomManager, sessionManager);
  });

  // Catch-all route to serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  return { app, httpServer, io, roomManager, sessionManager };
}

if (process.env.NODE_ENV !== 'test') {
  createServerApp().then(({ httpServer }) => {
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
