import { SocketHandler } from './types';
import { CardValue } from '../types';
import { LIMITS, isValidString } from '../utils/validation';

export const gameHandler: SocketHandler = (io, socket, roomManager, sessionManager) => {
    const sessionId = sessionManager.getSessionId(socket.id)!;

    socket.on('selectCard', (cardValue: CardValue) => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.get(sessionId);
        if (!player || player.isObserver) return; // Observers cannot select cards

        const success = roomManager.selectCard(roomCode, sessionId, cardValue);
        if (!success) return;

        // Notify all players that someone voted
        io.to(roomCode).emit('cardSelected', {
            playerId: sessionId,
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
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const player = roomManager.toggleObserver(roomCode, sessionId);
        if (!player) return;

        // Notify all players about observer status change
        io.to(roomCode).emit('observerToggled', {
            playerId: sessionId,
            isObserver: player.isObserver
        });
    });

    socket.on('throwEmoji', ({ toPlayerId, emoji }) => {
        if (typeof toPlayerId !== 'string') return;
        if (typeof emoji !== 'string') return;
        if (!isValidString(emoji, 1, LIMITS.emoji.max)) {
            socket.emit('error', `Emoji must be 1–${LIMITS.emoji.max} characters`);
            return;
        }

        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        // Verify target player exists in the room
        if (!room.players.has(toPlayerId)) return;

        // Broadcast emoji throw to all players in the room
        io.to(roomCode).emit('emojiThrown', {
            fromPlayerId: sessionId,
            toPlayerId,
            emoji
        });
    });

    socket.on('revealCards', () => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.get(sessionId);
        if (!player || !player.isModerator) return;

        const revealedRoom = roomManager.revealCards(roomCode);
        if (revealedRoom) {
            io.to(roomCode).emit('cardsRevealed', roomManager.getPlayersArray(revealedRoom));
        }
    });

    socket.on('startNewRound', () => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.get(sessionId);
        if (!player || !player.isModerator) return;

        const resetRoom = roomManager.startNewRound(roomCode);
        if (resetRoom) {
            io.to(roomCode).emit('newRound');
        }
    });
};
