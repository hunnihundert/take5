import { SocketHandler } from './types';
import { LIMITS, isValidString } from '../utils/validation';

export const storyHandler: SocketHandler = (io, socket, roomManager, sessionManager) => {
    const sessionId = sessionManager.getSessionId(socket.id)!;

    socket.on('addManualStory', async (summary: string) => {
        if (typeof summary !== 'string') return;
        if (!isValidString(summary, LIMITS.storySummary.min, LIMITS.storySummary.max)) {
            socket.emit('error', `Story summary must be ${LIMITS.storySummary.min}–${LIMITS.storySummary.max} characters`);
            return;
        }

        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        // Verify moderator
        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can add stories');
            return;
        }

        try {
            const story = await roomManager.addManualStory(roomCode, summary);
            if (story) {
                io.to(roomCode).emit('storyAdded', story);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('removeStory', async (storyId: string) => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can remove stories');
            return;
        }

        try {
            const success = await roomManager.removeStory(roomCode, storyId);
            if (success) {
                io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('selectStory', async (storyId: string | null) => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can select stories');
            return;
        }

        try {
            const story = await roomManager.selectStory(roomCode, storyId);
            io.to(roomCode).emit('storySelected', { storyId: storyId || '', story });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('applyStoryPoints', async (payload: unknown) => {
        if (typeof payload !== 'object' || payload === null) return;
        const { storyId, points } = payload as { storyId?: unknown; points?: unknown };
        if (typeof storyId !== 'string') return;
        if (typeof points !== 'number') return;
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can assign story points');
            return;
        }

        try {
            const story = await roomManager.applyStoryPoints(roomCode, storyId, points);
            if (story) {
                io.to(roomCode).emit('storyPointsApplied', { storyId, points });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('clearStories', async () => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can clear stories');
            return;
        }

        try {
            await roomManager.clearStories(roomCode);
            io.to(roomCode).emit('storiesUpdated', []);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });
};
