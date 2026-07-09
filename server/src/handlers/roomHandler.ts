import { SocketHandler } from './types';
import { logger } from '../utils/logger';
import { LIMITS, isValidString, validateAvatarUrl } from '../utils/validation';

export const roomHandler: SocketHandler = (io, socket, roomManager, sessionManager) => {
    const sessionId = sessionManager.getSessionId(socket.id)!;

    socket.on('createRoom', async (playerName, roomCode, callback) => {
        const ack = typeof callback === 'function' ? callback : () => {};
        if (typeof playerName !== 'string') return;
        if (!isValidString(playerName, LIMITS.playerName.min, LIMITS.playerName.max)) {
            ack({ success: false, error: `Player name must be ${LIMITS.playerName.min}–${LIMITS.playerName.max} characters` });
            return;
        }
        // Validate the code as the rest of the pipeline will use it — trimmed —
        // so a padded but otherwise valid code is not rejected on length.
        // A whitespace-only code counts as "no custom code" (auto-generate),
        // matching RoomManager.createRoom's own handling.
        let customCode: string | undefined;
        if (roomCode !== undefined && roomCode !== null) {
            if (typeof roomCode !== 'string') return;
            customCode = roomCode.trim() || undefined;
            if (customCode !== undefined && !isValidString(customCode, LIMITS.roomCode.min, LIMITS.roomCode.max)) {
                ack({ success: false, error: `Room code must be ${LIMITS.roomCode.min}–${LIMITS.roomCode.max} characters` });
                return;
            }
        }

        try {
            // A tab drives at most one room; other tabs of the same session
            // may sit in other rooms independently.
            const boundRoom = sessionManager.getRoomCodeForSocket(socket.id);
            if (boundRoom) {
                ack({ success: false, error: `This tab is already in room ${boundRoom}` });
                return;
            }

            const result = await roomManager.createRoom(playerName, sessionId, customCode);

            if (!result.success) {
                ack({ success: false, error: result.error });
                return;
            }

            const { room, player } = result.data;

            sessionManager.setSessionRoom(sessionId, room.code, {
                playerName,
                isModerator: true,
            });
            sessionManager.bindSocketToRoom(socket.id, room.code);

            socket.join(room.code);

            ack({ success: true, roomCode: room.code });
            socket.emit('roomJoined', {
                roomCode: room.code,
                player,
                players: roomManager.getPlayersArray(room),
                stories: room.stories,
                activeStoryId: room.activeStoryId ?? null,
                jiraConnected: room.jiraConfig !== undefined,
                cardValues: room.cardValues
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            ack({ success: false, error: message });
        }
    });

    socket.on('joinRoom', async (payload: unknown, callback) => {
        const ack = typeof callback === 'function' ? callback : () => {};
        if (typeof payload !== 'object' || payload === null) return;
        const { roomCode, playerName } = payload as { roomCode?: unknown; playerName?: unknown };
        if (typeof roomCode !== 'string') return;
        // Validate the code as the rest of the handler will use it — trimmed
        // and uppercased — so a padded but otherwise valid code is not
        // rejected on length
        const normalizedCode = roomCode.trim().toUpperCase();
        if (!isValidString(normalizedCode, LIMITS.roomCode.min, LIMITS.roomCode.max)) {
            ack({ success: false, error: `Room code must be ${LIMITS.roomCode.min}–${LIMITS.roomCode.max} characters` });
            return;
        }
        if (typeof playerName !== 'string') return;
        if (!isValidString(playerName, LIMITS.playerName.min, LIMITS.playerName.max)) {
            ack({ success: false, error: `Player name must be ${LIMITS.playerName.min}–${LIMITS.playerName.max} characters` });
            return;
        }

        try {
            // A tab drives at most one room; other tabs of the same session
            // may sit in other rooms independently.
            const boundRoom = sessionManager.getRoomCodeForSocket(socket.id);
            if (boundRoom) {
                ack({ success: false, error: `This tab is already in room ${boundRoom}` });
                return;
            }

            // Session already seated in this room (another tab or a grace
            // period): reattach this socket as the same player instead of
            // joining as a new one.
            if (sessionManager.isSessionInRoom(sessionId, normalizedCode)) {
                const room = roomManager.getRoom(normalizedCode);
                const player = room?.players.get(sessionId);
                if (room && player) {
                    const wasDisconnected = sessionManager.cancelDisconnectTimer(sessionId, room.code);
                    sessionManager.bindSocketToRoom(socket.id, room.code);
                    socket.join(room.code);

                    ack({ success: true });
                    socket.emit('roomJoined', {
                        roomCode: room.code,
                        player,
                        players: roomManager.getPlayersArray(room),
                        stories: room.stories,
                        activeStoryId: room.activeStoryId ?? null,
                        jiraConnected: room.jiraConfig !== undefined,
                        cardValues: room.cardValues
                    });

                    if (wasDisconnected) {
                        socket.to(room.code).emit('playerReconnected', { playerId: sessionId });
                    }
                    return;
                }
                // Stale membership — room or player is gone; fall through to a fresh join
                sessionManager.clearSessionRoom(sessionId, normalizedCode);
            }

            // Use the same normalized code as the reattach check above, so a
            // padded code (e.g. from a ?room= URL param) behaves identically
            // on both paths — RoomManager.joinRoom does not trim by itself.
            const result = await roomManager.joinRoom(normalizedCode, playerName, sessionId);

            if (!result.success) {
                ack({ success: false, error: result.error });
                return;
            }

            const { room, player } = result.data;

            sessionManager.setSessionRoom(sessionId, room.code, {
                playerName,
                isModerator: player.isModerator,
            });
            sessionManager.bindSocketToRoom(socket.id, room.code);

            socket.join(room.code);

            ack({ success: true });

            // Notify new player
            socket.emit('roomJoined', {
                roomCode: room.code,
                player,
                players: roomManager.getPlayersArray(room),
                stories: room.stories,
                activeStoryId: room.activeStoryId ?? null,
                jiraConnected: room.jiraConfig !== undefined,
                cardValues: room.cardValues
            });

            // Notify other players
            socket.to(room.code).emit('playerJoined', player);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            ack({ success: false, error: message });
        }
    });

    socket.on('updateAvatar', (avatarUrl: string | null) => {
        if (avatarUrl !== null) {
            const result = validateAvatarUrl(avatarUrl);
            if (!result.valid) {
                socket.emit('error', result.error);
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

    socket.on('transferModerator', (payload: unknown) => {
        if (typeof payload !== 'object' || payload === null) return;
        const { toPlayerId } = payload as { toPlayerId?: unknown };
        if (typeof toPlayerId !== 'string') return;
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
        // Scoped to the room this tab is bound to — other rooms the session
        // sits in (via other tabs) are unaffected.
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        // Mark this specific socket as voluntarily leaving. unregisterSocket()
        // returns wasVoluntary and clears the flag, so the disconnect handler
        // for this socket picks the short grace period. Other sockets for the
        // same session are unaffected — their wasVoluntary is false unless they
        // also emitted leaveRoom.
        sessionManager.markSocketVoluntaryLeave(socket.id);

        const socketsInRoom = sessionManager.getSocketIdsInRoom(sessionId, roomCode);
        if (socketsInRoom.size > 1) {
            // Other tabs still show this room, so no grace period is needed —
            // but still tear this socket down so the voluntary flag is consumed
            // by the disconnect handler right away. Leaving the socket connected
            // would let the flag go stale when the unload is cancelled (e.g. a
            // download click), and a much later involuntary disconnect of this
            // tab would then wrongly get the short voluntary grace period.
            socket.leave(roomCode);
            socket.disconnect(true);
            return;
        }

        // Notify others the player is temporarily gone (may come back on reload)
        socket.to(roomCode).emit('playerDisconnected', { playerId: sessionId });

        // Start a short grace period — enough time for a page reload to reconnect.
        // If the player reconnects within this window, the timer is cancelled and
        // they are fully restored. If not, they are removed as if they had left.
        sessionManager.startDisconnectTimer(sessionId, roomCode, () => {
            const result = roomManager.removePlayer(roomCode, sessionId);
            if (result.removed) {
                io.to(roomCode).emit('playerLeft', {
                    playerId: sessionId,
                    newModeratorId: result.newModerator?.id,
                });
            }
            sessionManager.clearSessionRoom(sessionId, roomCode);
            sessionManager.destroySessionIfIdle(sessionId);
            logger.info(`Session ${sessionId} removed from room ${roomCode} after voluntary grace period`);
        }, sessionManager.voluntaryDisconnectGraceMs);

        logger.info(`Voluntary grace period started for session ${sessionId} in room ${roomCode}`);

        // Stop the socket from receiving further room broadcasts and route
        // cleanup through the normal disconnect handler path.
        socket.leave(roomCode);
        socket.disconnect(true);
    });

    socket.on('disconnect', () => {
        const { sessionId: sid, roomCode, isLastSocketForRoom, isLastSocket, wasVoluntary } =
            sessionManager.unregisterSocket(socket.id);
        if (!sid) return;

        if (!roomCode) {
            // This tab wasn't in a room. Clean the session up only if nothing
            // else references it (no other tabs, no room memberships).
            if (isLastSocket) {
                logger.info(`Session ${sid} disconnected with no room`);
                sessionManager.destroySessionIfIdle(sid);
            }
            return;
        }

        // If other tabs still show this room, the seat stays live
        if (!isLastSocketForRoom) {
            logger.info(`Socket ${socket.id} disconnected, but session ${sid} still has other sockets in room ${roomCode}`);
            return;
        }

        // If leaveRoom already started a voluntary grace period, don't override it
        // with the longer involuntary grace period
        if (sessionManager.hasActiveTimer(sid, roomCode)) {
            logger.info(`Socket ${socket.id} disconnected for session ${sid} — voluntary grace period already running`);
            return;
        }

        // Choose grace period based on whether this socket requested leaveRoom
        const graceMs = wasVoluntary
            ? sessionManager.voluntaryDisconnectGraceMs
            : sessionManager.disconnectGraceMs;

        io.to(roomCode).emit('playerDisconnected', { playerId: sid });

        sessionManager.startDisconnectTimer(sid, roomCode, () => {
            const result = roomManager.removePlayer(roomCode, sid);
            if (result.removed) {
                io.to(roomCode).emit('playerLeft', {
                    playerId: sid,
                    newModeratorId: result.newModerator?.id
                });
            }
            sessionManager.clearSessionRoom(sid, roomCode);
            sessionManager.destroySessionIfIdle(sid);
            logger.info(`Session ${sid} removed from room ${roomCode} after ${wasVoluntary ? 'voluntary' : 'involuntary'} grace period`);
        }, graceMs);

        logger.info(`${wasVoluntary ? 'Voluntary' : 'Involuntary'} grace period started for session ${sid} in room ${roomCode}`);
    });
};
