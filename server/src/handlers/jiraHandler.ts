import { SocketHandler } from './types';
import { JiraService } from '../services/jiraService';

export const jiraHandler: SocketHandler = (io, socket, roomManager, socketToRoom) => {

    socket.on('configureJira', async (config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Jira konfigurieren');
            return;
        }

        // Test the connection first
        const testResult = await JiraService.testConnection(config);
        if (!testResult.success) {
            socket.emit('jiraError', { code: 'CONNECTION_FAILED', message: testResult.error || 'Verbindung fehlgeschlagen' });
            return;
        }

        // Store the config
        await roomManager.setJiraConfig(roomCode, config);
        io.to(roomCode).emit('jiraConfigured', { baseUrl: config.baseUrl });
        console.log(`Jira configured for room ${roomCode}: ${config.baseUrl}`);
    });

    socket.on('disconnectJira', async () => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Jira trennen');
            return;
        }

        await roomManager.clearJiraConfig(roomCode);
        io.to(roomCode).emit('jiraDisconnected');
        console.log(`Jira disconnected for room ${roomCode}`);
    });

    socket.on('addStoryByLink', async (url: string) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories hinzufügen');
            return;
        }

        // Parse the URL
        const parsed = JiraService.parseJiraUrl(url);
        if (!parsed) {
            socket.emit('jiraError', { code: 'INVALID_URL', message: 'Ungültige Jira-URL' });
            return;
        }

        // Check if Jira is configured
        const jiraConfig = roomManager.getJiraConfig(roomCode);
        if (!jiraConfig) {
            // Return info to configure Jira with detected base URL
            socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: `Jira nicht konfiguriert. Erkannte URL: ${parsed.baseUrl}` });
            return;
        }

        // Validate same Jira instance
        if (jiraConfig.baseUrl !== parsed.baseUrl) {
            socket.emit('jiraError', { code: 'INSTANCE_MISMATCH', message: `Falsche Jira-Instanz. Erwartet: ${jiraConfig.baseUrl}` });
            return;
        }

        // Fetch the issue
        const result = await JiraService.fetchIssue(jiraConfig, parsed.issueKey);
        if (!result.story) {
            socket.emit('jiraError', { code: 'FETCH_FAILED', message: result.error || 'Issue konnte nicht abgerufen werden' });
            return;
        }

        // Add to room (checks for duplicates)
        const addedStory = await roomManager.addJiraStory(roomCode, result.story);
        if (!addedStory) {
            socket.emit('jiraError', { code: 'DUPLICATE', message: `Story ${parsed.issueKey} ist bereits vorhanden` });
            return;
        }

        io.to(roomCode).emit('storyAdded', addedStory);
    });

    socket.on('fetchJiraStories', async (jql: string) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories importieren');
            return;
        }

        const jiraConfig = roomManager.getJiraConfig(roomCode);
        if (!jiraConfig) {
            socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: 'Jira nicht konfiguriert' });
            return;
        }

        const result = await JiraService.searchIssues(jiraConfig, jql);
        if (result.error) {
            socket.emit('jiraError', { code: 'SEARCH_FAILED', message: result.error });
            return;
        }

        // Add all fetched stories
        let addedCount = 0;
        for (const storyData of result.stories) {
            const addedStory = await roomManager.addJiraStory(roomCode, storyData);
            if (addedStory) {
                addedCount++;
            }
        }

        // Broadcast updated stories list
        io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));

        if (addedCount === 0 && result.stories.length > 0) {
            socket.emit('jiraError', { code: 'ALL_DUPLICATES', message: 'Alle gefundenen Stories sind bereits vorhanden' });
        }
    });

    socket.on('refreshJiraStories', async () => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, socket.id)) {
            socket.emit('error', 'Nur der Moderator kann Stories aktualisieren');
            return;
        }

        const jiraConfig = roomManager.getJiraConfig(roomCode);
        if (!jiraConfig) {
            socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: 'Jira nicht konfiguriert' });
            return;
        }

        // Refresh existing Jira stories
        const stories = roomManager.getStories(roomCode);
        const jiraStories = stories.filter(s => !s.isManual && s.key);

        for (const story of jiraStories) {
            const result = await JiraService.fetchIssue(jiraConfig, story.key!);
            if (result.story) {
                // Update story points if changed
                if (result.story.storyPoints !== undefined && result.story.storyPoints !== story.storyPoints) {
                    await roomManager.applyStoryPoints(roomCode, story.id, result.story.storyPoints);
                }
            }
        }

        io.to(roomCode).emit('storiesUpdated', roomManager.getStories(roomCode));
    });
};
