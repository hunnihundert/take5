import { SocketHandler } from './types';

export const storyHandler: SocketHandler = (io, socket, roomManager, socketToRoom) => {

    socket.on('addManualStory', async (summary: string) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        // Verify moderator
        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories hinzufügen');
            return;
        }

        const story = await roomManager.addManualStory(roomCode, summary);
        if (story) {
            io.to(roomCode).emit('storyAdded', story);
        }
    });

    socket.on('removeStory', async (storyId: string) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories entfernen');
            return;
        }

        const success = await roomManager.removeStory(roomCode, storyId);
        if (success) {
            io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));
        }
    });

    socket.on('selectStory', async (storyId: string | null) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories auswählen');
            return;
        }

        const story = await roomManager.selectStory(roomCode, storyId);
        io.to(roomCode).emit('storySelected', { storyId: storyId || '', story });
    });

    socket.on('applyStoryPoints', async ({ storyId, points }: { storyId: string; points: number }) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Story Points vergeben');
            return;
        }

        const story = await roomManager.applyStoryPoints(roomCode, storyId, points);
        if (story) {
            io.to(roomCode).emit('storyPointsApplied', { storyId, points });
        }
    });

    socket.on('clearStories', async () => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories löschen');
            return;
        }

        await roomManager.clearStories(roomCode);
        io.to(roomCode).emit('storiesUpdated', []);
    });
};
