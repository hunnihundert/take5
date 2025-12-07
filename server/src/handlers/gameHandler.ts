import { SocketHandler } from './types';
import { CardValue } from '../types';

export const gameHandler: SocketHandler = (io, socket, roomManager, socketToRoom) => {

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
};
