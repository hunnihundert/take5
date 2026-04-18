import { SocketHandler } from './types';
import { logger } from '../utils/logger';
import { LIMITS, isValidString } from '../utils/validation';

export const roomHandler: SocketHandler = (io, socket, roomManager, sessionManager) => {
    const sessionId = sessionManager.getSessionId(socket.id)!;

    socket.on('createRoom', async (playerName, roomCode, callback) => {
        const ack = typeof callback === 'function' ? callback : () => {};
        if (typeof playerName !== 'string') return;
        if (!isValidString(playerName, LIMITS.playerName.min, LIMITS.playerName.max)) {
            ack({ success: false, error: `Player name must be 1–${LIMITS.playerName.max} characters` });
            return;
        }
        if (roomCode !== undefined && roomCode !== null) {
            if (typeof roomCode !== 'string') return;
            if (!isValidString(roomCode, LIMITS.roomCode.min, LIMITS.roomCode.max)) {
                ack({ success: false, error: `Room code must be ${LIMITS.roomCode.min}–${LIMITS.roomCode.max} characters` });
                return;
            }
        }

        try {
            // Check if session is already in a room
            const existingRoom = sessionManager.getSessionInfo(sessionId)?.roomCode;
            if (existingRoom) {
                ack({ success: false, error: `You are already in room ${existingRoom}` });
                return;
            }

            const result = await roomManager.createRoom(playerName, sessionId, roomCode);

            if (!result.success) {
                ack({ success: false, error: result.error });
                return;
            }

            const { room, player } = result.data;

            sessionManager.setSessionRoom(sessionId, room.code, {
                playerName,
                isModerator: true,
            });

            socket.join(room.code);

            ack({ success: true, roomCode: room.code });
            socket.emit('roomJoined', {
                roomCode: room.code,
                player,
                players: roomManager.getPlayersArray(room),
                stories: room.stories,
                activeStoryId: room.activeStoryId ?? null,
                jiraConnected: room.jiraConfig !== undefined
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            ack({ success: false, error: message });
        }
    });

    socket.on('joinRoom', async (payload: unknown, callback) => {
        if (typeof payload !== 'object' || payload === null) return;
        const { roomCode, playerName } = payload as { roomCode?: unknown; playerName?: unknown };
        if (typeof roomCode !== 'string') return;
        if (!isValidString(roomCode, LIMITS.roomCode.min, LIMITS.roomCode.max)) {
            callback({ success: false, error: `Room code must be ${LIMITS.roomCode.min}–${LIMITS.roomCode.max} characters` });
            return;
        }
        if (typeof playerName !== 'string') return;
        if (!isValidString(playerName, LIMITS.playerName.min, LIMITS.playerName.max)) {
            callback({ success: false, error: `Player name must be 1–${LIMITS.playerName.max} characters` });
            return;
        }

        try {
            // Check if session is already in a different room
            const existingRoom = sessionManager.getSessionInfo(sessionId)?.roomCode;
            if (existingRoom && existingRoom.toUpperCase() !== roomCode.toUpperCase()) {
                callback({ success: false, error: `You are already in room ${existingRoom}` });
                return;
            }

            const result = await roomManager.joinRoom(roomCode, playerName, sessionId);

            if (!result.success) {
                callback({ success: false, error: result.error });
                return;
            }

            const { room, player } = result.data;

            sessionManager.setSessionRoom(sessionId, room.code, {
                playerName,
                isModerator: player.isModerator,
            });

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            callback({ success: false, error: message });
        }
    });

    socket.on('updateAvatar', (avatarUrl: string | null) => {
        if (avatarUrl !== null) {
            if (typeof avatarUrl !== 'string') return;
            if (avatarUrl.length > LIMITS.avatarUrl.max) {
                socket.emit('error', `Avatar URL must be ${LIMITS.avatarUrl.max} characters or fewer`);
                return;
            }
        }

        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const player = roomManager.updateAvatar(roomCode, sessionId, avatarUrl);
        if (!player) return;

        // Notify all players about avatar change
        io.to(roomCode).emit('avatarUpdated', {
            playerId: sessionId,
            avatarUrl: player.avatarUrl
        });
    });

    socket.on('transferModerator', ({ toPlayerId }: { toPlayerId: string }) => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        const success = roomManager.transferModerator(roomCode, sessionId, toPlayerId);
        if (!success) return;

        io.to(roomCode).emit('moderatorTransferred', {
            fromPlayerId: sessionId,
            toPlayerId,
        });
    });

    socket.on('leaveRoom', () => {
        const sessionInfo = sessionManager.getSessionInfo(sessionId);
        if (!sessionInfo?.roomCode) return;

        // Mark this specific socket as voluntarily leaving. unregisterSocket()
        // returns wasVoluntary and clears the flag, so the disconnect handler
        // for this socket picks the short grace period. Other sockets for the
        // same session are unaffected — their wasVoluntary is false unless they
        // also emitted leaveRoom.
        sessionManager.markSocketVoluntaryLeave(socket.id);

        const sockets = sessionManager.getSocketIds(sessionId);
        if (sockets.size > 1) return; // other tabs still open — last disconnect handles it

        const roomCode = sessionInfo.roomCode;

        // Notify others the player is temporarily gone (may come back on reload)
        socket.to(roomCode).emit('playerDisconnected', { playerId: sessionId });

        // Start a short grace period — enough time for a page reload to reconnect.
        // If the player reconnects within this window, the timer is cancelled and
        // they are fully restored. If not, they are removed as if they had left.
        sessionManager.startDisconnectTimer(sessionId, () => {
            const result = roomManager.removePlayer(roomCode, sessionId);
            if (result.removed) {
                io.to(roomCode).emit('playerLeft', {
                    playerId: sessionId,
                    newModeratorId: result.newModerator?.id,
                });
            }
            sessionManager.destroySession(sessionId);
            logger.info(`Session ${sessionId} removed from room ${roomCode} after voluntary grace period`);
        }, sessionManager.voluntaryDisconnectGraceMs);

        logger.info(`Voluntary grace period started for session ${sessionId} in room ${roomCode}`);

        // Stop the socket from receiving further room broadcasts and route
        // cleanup through the normal disconnect handler path.
        socket.leave(roomCode);
        socket.disconnect(true);
    });

    socket.on('disconnect', () => {
        const { sessionId: sid, isLastSocket, wasVoluntary } = sessionManager.unregisterSocket(socket.id);
        if (!sid) return;

        // If other tabs are still connected, do nothing
        if (!isLastSocket) {
            logger.info(`Socket ${socket.id} disconnected, but session ${sid} still has other sockets`);
            return;
        }

        const sessionInfo = sessionManager.getSessionInfo(sid);
        if (!sessionInfo?.roomCode) {
            logger.info(`Session ${sid} disconnected with no room`);
            sessionManager.destroySession(sid);
            return;
        }

        const roomCode = sessionInfo.roomCode;

        // If leaveRoom already started a voluntary grace period, don't override it
        // with the longer involuntary grace period
        if (sessionManager.hasActiveTimer(sid)) {
            logger.info(`Socket ${socket.id} disconnected for session ${sid} — voluntary grace period already running`);
            return;
        }

        // Choose grace period based on whether this socket requested leaveRoom
        const graceMs = wasVoluntary
            ? sessionManager.voluntaryDisconnectGraceMs
            : sessionManager.disconnectGraceMs;

        io.to(roomCode).emit('playerDisconnected', { playerId: sid });

        sessionManager.startDisconnectTimer(sid, () => {
            const result = roomManager.removePlayer(roomCode, sid);
            if (result.removed) {
                io.to(roomCode).emit('playerLeft', {
                    playerId: sid,
                    newModeratorId: result.newModerator?.id
                });
            }
            sessionManager.destroySession(sid);
            logger.info(`Session ${sid} removed from room ${roomCode} after ${wasVoluntary ? 'voluntary' : 'involuntary'} grace period`);
        }, graceMs);

        logger.info(`${wasVoluntary ? 'Voluntary' : 'Involuntary'} grace period started for session ${sid} in room ${roomCode}`);
    });
};
