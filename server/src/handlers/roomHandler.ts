import { SocketHandler } from './types';
import { logger } from '../utils/logger';

export const roomHandler: SocketHandler = (io, socket, roomManager, socketToRoom) => {

    socket.on('createRoom', async (playerName: string, callback) => {
        try {
            const result = await roomManager.createRoom(playerName, socket.id);

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
                activeStoryId: room.activeStoryId ?? null,
                jiraConnected: room.jiraConfig !== undefined
            });
        } catch (error) {
            callback({ success: false, error: 'Fehler beim Erstellen des Raums' });
        }
    });

    socket.on('joinRoom', async ({ roomCode, playerName }, callback) => {
        try {
            const result = await roomManager.joinRoom(roomCode, playerName, socket.id);

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
                activeStoryId: room.activeStoryId ?? null,
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
            const result = roomManager.removePlayer(roomCode, socket.id);
            if (result.removed) {
                socket.to(roomCode).emit('playerLeft', {
                    playerId: socket.id,
                    newModeratorId: result.newModerator?.id
                });
            }
            socketToRoom.delete(socket.id);
            console.log(`Player ${socket.id} left room ${roomCode}`);
        }
        console.log('Client disconnected:', socket.id);
    });
};
