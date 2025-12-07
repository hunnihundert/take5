import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JiraService } from './jiraService';
import { JiraConfig } from '@taking5/shared';

// Mock global fetch
const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('JiraService', () => {
    const mockConfig: JiraConfig = {
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'token123',
        storyPointsFieldId: 'customfield_10001'
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('parseJiraUrl', () => {
        it('should parse browse URL', () => {
            const url = 'https://company.atlassian.net/browse/PROJ-123';
            const result = JiraService.parseJiraUrl(url);
            expect(result).toEqual({
                baseUrl: 'https://company.atlassian.net',
                issueKey: 'PROJ-123'
            });
        });

        it('should parse backlog URL with selectedIssue', () => {
            const url = 'https://company.atlassian.net/jira/software?selectedIssue=PROJ-123';
            const result = JiraService.parseJiraUrl(url);
            expect(result).toEqual({
                baseUrl: 'https://company.atlassian.net',
                issueKey: 'PROJ-123'
            });
        });

        it('should return null for invalid URL', () => {
            const result = JiraService.parseJiraUrl('not-a-url');
            expect(result).toBeNull();
        });
    });

    describe('testConnection', () => {
        it('should return success when API returns 200', async () => {
            globalFetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            const result = await JiraService.testConnection(mockConfig);
            expect(result).toEqual({ success: true });
            expect(globalFetch).toHaveBeenCalledWith(
                'https://test.atlassian.net/rest/api/3/myself',
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should return error on 401', async () => {
            globalFetch.mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            const result = await JiraService.testConnection(mockConfig);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Ungültige Anmeldedaten');
        });
    });

    describe('fetchIssue', () => {
        it('should fetch and parse issue correctly', async () => {
            const mockIssue = {
                key: 'PROJ-123',
                fields: {
                    summary: 'Test Story',
                    customfield_10001: 5
                }
            };

            globalFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssue
            });

            const result = await JiraService.fetchIssue(mockConfig, 'PROJ-123');

            expect(result.story).toBeDefined();
            expect(result.story?.key).toBe('PROJ-123');
            expect(result.story?.summary).toBe('Test Story');
            expect(result.story?.storyPoints).toBe(5);
            expect(result.story?.voted).toBe(true);
        });

        it('should handle missing story points', async () => {
            const mockIssue = {
                key: 'PROJ-123',
                fields: {
                    summary: 'Test Story',
                    // no points field
                }
            };

            globalFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssue
            });

            const result = await JiraService.fetchIssue(mockConfig, 'PROJ-123');
            expect(result.story?.storyPoints).toBeUndefined();
            expect(result.story?.voted).toBe(false);
        });
    });
});
