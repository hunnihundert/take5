import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent, waitForReady, TestClient } from '../test/testUtils';
import { JiraService } from '../services/jiraService';
import { LIMITS } from '../utils/validation';

vi.mock('../services/jiraService', () => ({
  JiraService: {
    testConnection: vi.fn(),
    parseJiraUrl: vi.fn(),
    fetchIssue: vi.fn(),
    searchIssues: vi.fn(),
  },
}));

const mockJiraService = vi.mocked(JiraService);

const VALID_CONFIG = {
  baseUrl: 'https://example.atlassian.net',
  email: 'test@example.com',
  apiToken: 'token123',
};

describe('Jira Handler Integration', () => {
  let server: any;
  let testIndex = 0;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  let moderator: TestClient;
  let nonModerator: TestClient;
  let roomCode: string;

  beforeEach(async () => {
    testIndex++;
    roomCode = `JIRA${testIndex}`;

    moderator = createSocketClient(server.port);
    nonModerator = createSocketClient(server.port);

    await Promise.all([waitForReady(moderator), waitForReady(nonModerator)]);

    await new Promise<void>((resolve) => {
      moderator.emit('createRoom', 'Moderator', roomCode, () => resolve());
    });
    await new Promise<void>((resolve) => {
      nonModerator.emit('joinRoom', { roomCode, playerName: 'Player2' }, () => resolve());
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (moderator.connected) moderator.disconnect();
    if (nonModerator.connected) nonModerator.disconnect();
  });

  describe('configureJira validation', () => {
    it('should silently ignore non-object payload', async () => {
      const timeout = new Promise<'timeout'>((res) => setTimeout(() => res('timeout'), 150));
      const event = new Promise<'event'>((res) => moderator.once('jiraConfigured', () => res('event')));

      (moderator as any).emit('configureJira', 'not-an-object');
      expect(await Promise.race([event, timeout])).toBe('timeout');
    });

    it('should emit error when baseUrl exceeds max length', async () => {
      const errorPromise = waitForEvent<any>(moderator, 'error');
      (moderator as any).emit('configureJira', {
        ...VALID_CONFIG,
        baseUrl: 'https://' + 'a'.repeat(LIMITS.jiraBaseUrl.max),
      });
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/base url/i);
    });

    it('should emit error when email exceeds max length', async () => {
      const errorPromise = waitForEvent<any>(moderator, 'error');
      (moderator as any).emit('configureJira', {
        ...VALID_CONFIG,
        email: 'a'.repeat(LIMITS.jiraEmail.max + 1),
      });
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/email/i);
    });

    it('should emit error when apiToken exceeds max length', async () => {
      const errorPromise = waitForEvent<any>(moderator, 'error');
      (moderator as any).emit('configureJira', {
        ...VALID_CONFIG,
        apiToken: 'a'.repeat(LIMITS.jiraApiToken.max + 1),
      });
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/api token/i);
    });

    it('should silently ignore non-string storyPointsFieldId', async () => {
      const timeout = new Promise<'timeout'>((res) => setTimeout(() => res('timeout'), 150));
      const event = new Promise<'event'>((res) => moderator.once('jiraConfigured', () => res('event')));

      (moderator as any).emit('configureJira', { ...VALID_CONFIG, storyPointsFieldId: 12345 });
      expect(await Promise.race([event, timeout])).toBe('timeout');
    });

    it('should emit error when storyPointsFieldId exceeds max length', async () => {
      const errorPromise = waitForEvent<any>(moderator, 'error');
      (moderator as any).emit('configureJira', {
        ...VALID_CONFIG,
        storyPointsFieldId: 'a'.repeat(LIMITS.jiraFieldId.max + 1),
      });
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/field id/i);
    });

    it('should emit error when non-moderator attempts to configure Jira', async () => {
      mockJiraService.testConnection.mockResolvedValue({ success: true });
      const errorPromise = waitForEvent<any>(nonModerator, 'error');
      (nonModerator as any).emit('configureJira', VALID_CONFIG);
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/moderator/i);
    });

    it('should emit jiraError when connection test fails', async () => {
      mockJiraService.testConnection.mockResolvedValue({ success: false, error: 'Unauthorized' });
      const jiraErrorPromise = waitForEvent<any>(moderator, 'jiraError');
      (moderator as any).emit('configureJira', VALID_CONFIG);
      const err = await jiraErrorPromise;
      expect(err.code).toBe('CONNECTION_FAILED');
    });

    it('should emit jiraConfigured on success', async () => {
      mockJiraService.testConnection.mockResolvedValue({ success: true });
      const configuredPromise = waitForEvent<any>(moderator, 'jiraConfigured');
      (moderator as any).emit('configureJira', VALID_CONFIG);
      const data = await configuredPromise;
      expect(data.baseUrl).toBe(VALID_CONFIG.baseUrl);
    });
  });

  describe('addStoryByLink validation', () => {
    it('should silently ignore non-string url', async () => {
      const timeout = new Promise<'timeout'>((res) => setTimeout(() => res('timeout'), 150));
      const event = new Promise<'event'>((res) => moderator.once('storyAdded', () => res('event')));

      (moderator as any).emit('addStoryByLink', 12345);
      expect(await Promise.race([event, timeout])).toBe('timeout');
    });

    it('should emit jiraError when url exceeds max length', async () => {
      const jiraErrorPromise = waitForEvent<any>(moderator, 'jiraError');
      (moderator as any).emit('addStoryByLink', 'https://' + 'a'.repeat(LIMITS.jiraIssueUrl.max));
      const err = await jiraErrorPromise;
      expect(err.code).toBe('INVALID_URL');
    });

    it('should emit error when non-moderator attempts to add story by link', async () => {
      const errorPromise = waitForEvent<any>(nonModerator, 'error');
      (nonModerator as any).emit('addStoryByLink', 'https://example.atlassian.net/browse/PROJ-1');
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/moderator/i);
    });

    it('should emit jiraError when url cannot be parsed', async () => {
      mockJiraService.parseJiraUrl.mockReturnValue(null);
      const jiraErrorPromise = waitForEvent<any>(moderator, 'jiraError');
      (moderator as any).emit('addStoryByLink', 'https://not-jira.example.com/browse/PROJ-1');
      const err = await jiraErrorPromise;
      expect(err.code).toBe('INVALID_URL');
    });

    it('should emit jiraError when Jira is not configured', async () => {
      mockJiraService.parseJiraUrl.mockReturnValue({
        baseUrl: 'https://example.atlassian.net',
        issueKey: 'PROJ-1',
      });
      const jiraErrorPromise = waitForEvent<any>(moderator, 'jiraError');
      (moderator as any).emit('addStoryByLink', 'https://example.atlassian.net/browse/PROJ-1');
      const err = await jiraErrorPromise;
      expect(err.code).toBe('NOT_CONFIGURED');
    });
  });

  describe('fetchJiraStories validation', () => {
    it('should silently ignore non-string jql', async () => {
      const timeout = new Promise<'timeout'>((res) => setTimeout(() => res('timeout'), 150));
      const event = new Promise<'event'>((res) => moderator.once('storiesUpdated', () => res('event')));

      (moderator as any).emit('fetchJiraStories', 12345);
      expect(await Promise.race([event, timeout])).toBe('timeout');
    });

    it('should emit error when jql exceeds max length', async () => {
      const errorPromise = waitForEvent<any>(moderator, 'error');
      (moderator as any).emit('fetchJiraStories', 'a'.repeat(LIMITS.jql.max + 1));
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/jql/i);
    });

    it('should emit error when non-moderator attempts to fetch stories', async () => {
      const errorPromise = waitForEvent<any>(nonModerator, 'error');
      (nonModerator as any).emit('fetchJiraStories', 'project = PROJ');
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/moderator/i);
    });

    it('should emit jiraError when Jira is not configured', async () => {
      const jiraErrorPromise = waitForEvent<any>(moderator, 'jiraError');
      (moderator as any).emit('fetchJiraStories', 'project = PROJ');
      const err = await jiraErrorPromise;
      expect(err.code).toBe('NOT_CONFIGURED');
    });
  });
});
