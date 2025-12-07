import { SocketHandler } from './types';

export const roomHandler: SocketHandler = (io, socket, roomManager, socketToRoom) => {

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
