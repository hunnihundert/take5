import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './roomManager';
import { ServerToClientEvents, ClientToServerEvents } from './types';
import { roomHandler } from './handlers/roomHandler';
import { gameHandler } from './handlers/gameHandler';
import { storyHandler } from './handlers/storyHandler';
import { jiraHandler } from './handlers/jiraHandler';
import { initDatabase, isDatabaseEnabled, syncSchema } from './db';
import { RoomRepository } from './db/repository';

export async function createServerApp() {
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
  const socketToRoom = new Map<string, string>();

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // Register all handlers
    roomHandler(io, socket, roomManager, socketToRoom);
    gameHandler(io, socket, roomManager, socketToRoom);
    storyHandler(io, socket, roomManager, socketToRoom);
    jiraHandler(io, socket, roomManager, socketToRoom);
  });

  // Catch-all route to serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  return { app, httpServer, io, roomManager };
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
