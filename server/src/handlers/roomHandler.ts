import { SocketHandler } from './types';
import { logger } from '../utils/logger';

export const roomHandler: SocketHandler = (io, socket, roomManager, socketToRoom) => {

    socket.on('createRoom', (playerName: string, callback) => {
        try {
            const result = roomManager.createRoom(playerName, socket.id);

            if (!result.success) {
                callback({ success: false, error: result.error });
                return;
            }

            const { room, player } = result.data;
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
        } catch (error) {
            callback({ success: false, error: 'Fehler beim Erstellen des Raums' });
        }
    });

    socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
        try {
            const result = roomManager.joinRoom(roomCode, playerName, socket.id);

            if (!result) { // This case is actually covered by result.success being false if I adhered to my own type, but joinRoom returns Result which is objects. Wait, does joinRoom return null? No, I defined it to return Result.
                // Re-reading my RoomManager code: 
                // joinRoom returns Result<{ room: Room; player: Player }>
                // So it will never be null/undefined.
                // However, the original code checked for !result.
            }
            // Let's safe guard.

            if (!result.success) {
                callback({ success: false, error: result.error });
                return;
            }

            const { room, player } = result.data;
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
        } catch (error) {
            callback({ success: false, error: 'Fehler beim Beitreten' });
        }
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
};
