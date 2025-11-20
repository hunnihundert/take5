import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './roomManager';
import { ServerToClientEvents, ClientToServerEvents, CardValue } from './types';

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
        players: roomManager.getPlayersArray(room)
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
        players: roomManager.getPlayersArray(room)
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
