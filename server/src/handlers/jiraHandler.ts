import { SocketHandler } from './types';
import { JiraService } from '../services/jiraService';
import { LIMITS, isValidString } from '../utils/validation';

export const jiraHandler: SocketHandler = (io, socket, roomManager, sessionManager) => {
    const sessionId = sessionManager.getSessionId(socket.id)!;

    socket.on('configureJira', async (config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => {
        if (!config || typeof config !== 'object') return;
        if (typeof config.baseUrl !== 'string') return;
        if (typeof config.email !== 'string') return;
        if (typeof config.apiToken !== 'string') return;
        if (!isValidString(config.baseUrl, 1, LIMITS.jiraBaseUrl.max)) {
            socket.emit('error', `Jira base URL must be 1–${LIMITS.jiraBaseUrl.max} characters`);
            return;
        }
        if (!isValidString(config.email, 1, LIMITS.jiraEmail.max)) {
            socket.emit('error', `Jira email must be 1–${LIMITS.jiraEmail.max} characters`);
            return;
        }
        if (!isValidString(config.apiToken, 1, LIMITS.jiraApiToken.max)) {
            socket.emit('error', `Jira API token must be 1–${LIMITS.jiraApiToken.max} characters`);
            return;
        }
        if (config.storyPointsFieldId !== undefined) {
            if (typeof config.storyPointsFieldId !== 'string') return;
            if (!isValidString(config.storyPointsFieldId, 1, LIMITS.jiraFieldId.max)) {
                socket.emit('error', `Jira field ID must be 1–${LIMITS.jiraFieldId.max} characters`);
                return;
            }
        }

        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can configure Jira');
            return;
        }

        // Test the connection first
        const testResult = await JiraService.testConnection(config);
        if (!testResult.success) {
            socket.emit('jiraError', { code: 'CONNECTION_FAILED', message: testResult.error || 'Connection failed' });
            return;
        }

        try {
            // Store the config
            await roomManager.setJiraConfig(roomCode, config);
            io.to(roomCode).emit('jiraConfigured', { baseUrl: config.baseUrl });
            console.log(`Jira configured for room ${roomCode}: ${config.baseUrl}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('disconnectJira', async () => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can disconnect Jira');
            return;
        }

        try {
            await roomManager.clearJiraConfig(roomCode);
            io.to(roomCode).emit('jiraDisconnected');
            console.log(`Jira disconnected for room ${roomCode}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('addStoryByLink', async (url: string) => {
        if (typeof url !== 'string') return;
        if (!isValidString(url, 1, LIMITS.jiraBaseUrl.max + 100)) {
            socket.emit('jiraError', { code: 'INVALID_URL', message: 'URL is too long' });
            return;
        }

        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can add stories');
            return;
        }

        // Parse the URL
        const parsed = JiraService.parseJiraUrl(url);
        if (!parsed) {
            socket.emit('jiraError', { code: 'INVALID_URL', message: 'Invalid Jira URL' });
            return;
        }

        // Check if Jira is configured
        const jiraConfig = roomManager.getJiraConfig(roomCode);
        if (!jiraConfig) {
            // Return info to configure Jira with detected base URL
            socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: `Jira not configured. Detected URL: ${parsed.baseUrl}` });
            return;
        }

        // Validate same Jira instance
        if (jiraConfig.baseUrl !== parsed.baseUrl) {
            socket.emit('jiraError', { code: 'INSTANCE_MISMATCH', message: `Wrong Jira instance. Expected: ${jiraConfig.baseUrl}` });
            return;
        }

        // Fetch the issue
        const result = await JiraService.fetchIssue(jiraConfig, parsed.issueKey);
        if (!result.story) {
            socket.emit('jiraError', { code: 'FETCH_FAILED', message: result.error || 'Failed to fetch issue' });
            return;
        }

        try {
            // Add to room (checks for duplicates)
            const addedStory = await roomManager.addJiraStory(roomCode, result.story);
            if (!addedStory) {
                socket.emit('jiraError', { code: 'DUPLICATE', message: `Story ${parsed.issueKey} already exists` });
                return;
            }

            io.to(roomCode).emit('storyAdded', addedStory);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('fetchJiraStories', async (jql: string) => {
        if (typeof jql !== 'string') return;
        if (!isValidString(jql, 1, LIMITS.jql.max)) {
            socket.emit('error', `JQL must be 1–${LIMITS.jql.max} characters`);
            return;
        }

        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can import stories');
            return;
        }

        const jiraConfig = roomManager.getJiraConfig(roomCode);
        if (!jiraConfig) {
            socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: 'Jira not configured' });
            return;
        }

        const result = await JiraService.searchIssues(jiraConfig, jql);
        if (result.error) {
            socket.emit('jiraError', { code: 'SEARCH_FAILED', message: result.error });
            return;
        }

        try {
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
                socket.emit('jiraError', { code: 'ALL_DUPLICATES', message: 'All found stories already exist' });
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });

    socket.on('refreshJiraStories', async () => {
        const roomCode = sessionManager.getRoomCodeForSocket(socket.id);
        if (!roomCode) return;

        if (!roomManager.isModerator(roomCode, sessionId)) {
            socket.emit('error', 'Only the moderator can refresh stories');
            return;
        }

        const jiraConfig = roomManager.getJiraConfig(roomCode);
        if (!jiraConfig) {
            socket.emit('jiraError', { code: 'NOT_CONFIGURED', message: 'Jira not configured' });
            return;
        }

        try {
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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            socket.emit('error', message);
        }
    });
};
