import { JiraConfig, Story } from '../types';

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    [key: string]: unknown;
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}

export class JiraService {
  /**
   * Parse a Jira URL to extract base URL and issue key
   */
  static parseJiraUrl(url: string): { baseUrl: string; issueKey: string } | null {
    try {
      const parsed = new URL(url);

      // Match patterns like:
      // https://company.atlassian.net/browse/PROJ-123
      // https://company.atlassian.net/jira/software/projects/PROJ/boards/1?selectedIssue=PROJ-123

      const browseMatch = parsed.pathname.match(/\/browse\/([A-Z]+-\d+)/i);
      if (browseMatch) {
        return {
          baseUrl: `${parsed.protocol}//${parsed.host}`,
          issueKey: browseMatch[1].toUpperCase()
        };
      }

      // Check for selectedIssue query param
      const selectedIssue = parsed.searchParams.get('selectedIssue');
      if (selectedIssue && /^[A-Z]+-\d+$/i.test(selectedIssue)) {
        return {
          baseUrl: `${parsed.protocol}//${parsed.host}`,
          issueKey: selectedIssue.toUpperCase()
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Test connection to Jira with provided credentials
   */
  static async testConnection(config: JiraConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${config.baseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: this.getAuthHeaders(config)
      });

      if (response.ok) {
        return { success: true };
      }

      if (response.status === 401) {
        return { success: false, error: 'Ungültige Anmeldedaten' };
      }

      if (response.status === 403) {
        return { success: false, error: 'Zugriff verweigert. Bitte API-Token-Berechtigungen prüfen.' };
      }

      return { success: false, error: `Verbindungsfehler: ${response.status}` };
    } catch (error) {
      return { success: false, error: 'Verbindung fehlgeschlagen. Bitte URL prüfen.' };
    }
  }

  /**
   * Fetch a single issue by key
   */
  static async fetchIssue(config: JiraConfig, issueKey: string): Promise<{ story: Story | null; error?: string }> {
    try {
      const fields = config.storyPointsFieldId
        ? `summary,${config.storyPointsFieldId}`
        : 'summary';

      const response = await fetch(
        `${config.baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(config)
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { story: null, error: 'Issue nicht gefunden' };
        }
        if (response.status === 401) {
          return { story: null, error: 'Ungültige Anmeldedaten' };
        }
        return { story: null, error: `Fehler beim Abrufen: ${response.status}` };
      }

      const issue = await response.json() as JiraIssue;

      let storyPoints: number | undefined;
      if (config.storyPointsFieldId && issue.fields[config.storyPointsFieldId]) {
        const points = issue.fields[config.storyPointsFieldId];
        if (typeof points === 'number') {
          storyPoints = points;
        }
      }

      return {
        story: {
          id: '', // Will be set by RoomManager
          key: issue.key,
          summary: issue.fields.summary,
          storyPoints,
          url: `${config.baseUrl}/browse/${issue.key}`,
          isManual: false,
          voted: storyPoints !== undefined
        }
      };
    } catch (error) {
      return { story: null, error: 'Netzwerkfehler beim Abrufen des Issues' };
    }
  }

  /**
   * Search issues using JQL
   */
  static async searchIssues(config: JiraConfig, jql: string, maxResults: number = 50): Promise<{ stories: Omit<Story, 'id' | 'isManual' | 'voted'>[]; error?: string }> {
    try {
      // Sanitize JQL - basic protection against injection
      const sanitizedJql = jql
        .replace(/[;\-]{2,}/g, '') // Remove SQL comment patterns
        .trim();

      const fields = config.storyPointsFieldId
        ? `summary,${config.storyPointsFieldId}`
        : 'summary';

      const response = await fetch(
        `${config.baseUrl}/rest/api/3/search`,
        {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(config),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jql: sanitizedJql,
            fields: fields.split(','),
            maxResults
          })
        }
      );

      if (!response.ok) {
        if (response.status === 400) {
          return { stories: [], error: 'Ungültige JQL-Abfrage' };
        }
        if (response.status === 401) {
          return { stories: [], error: 'Ungültige Anmeldedaten' };
        }
        return { stories: [], error: `Suchfehler: ${response.status}` };
      }

      const data = await response.json() as JiraSearchResponse;

      const stories = data.issues.map(issue => {
        let storyPoints: number | undefined;
        if (config.storyPointsFieldId && issue.fields[config.storyPointsFieldId]) {
          const points = issue.fields[config.storyPointsFieldId];
          if (typeof points === 'number') {
            storyPoints = points;
          }
        }

        return {
          key: issue.key,
          summary: issue.fields.summary,
          storyPoints,
          url: `${config.baseUrl}/browse/${issue.key}`
        };
      });

      return { stories };
    } catch (error) {
      return { stories: [], error: 'Netzwerkfehler bei der Suche' };
    }
  }

  /**
   * Update story points on a Jira issue
   */
  static async updateStoryPoints(config: JiraConfig, issueKey: string, points: number): Promise<{ success: boolean; error?: string }> {
    if (!config.storyPointsFieldId) {
      return { success: false, error: 'Story Points Feld nicht konfiguriert' };
    }

    try {
      const response = await fetch(
        `${config.baseUrl}/rest/api/3/issue/${issueKey}`,
        {
          method: 'PUT',
          headers: {
            ...this.getAuthHeaders(config),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              [config.storyPointsFieldId]: points
            }
          })
        }
      );

      if (response.ok || response.status === 204) {
        return { success: true };
      }

      if (response.status === 401) {
        return { success: false, error: 'Ungültige Anmeldedaten' };
      }

      if (response.status === 403) {
        return { success: false, error: 'Keine Berechtigung zum Bearbeiten' };
      }

      if (response.status === 404) {
        return { success: false, error: 'Issue nicht gefunden' };
      }

      return { success: false, error: `Aktualisierungsfehler: ${response.status}` };
    } catch (error) {
      return { success: false, error: 'Netzwerkfehler beim Aktualisieren' };
    }
  }

  /**
   * Find the story points field ID by searching for common field names
   */
  static async findStoryPointsField(config: JiraConfig): Promise<{ fieldId: string | null; error?: string }> {
    try {
      const response = await fetch(
        `${config.baseUrl}/rest/api/3/field`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(config)
        }
      );

      if (!response.ok) {
        return { fieldId: null, error: 'Konnte Felder nicht abrufen' };
      }

      const fields = await response.json() as Array<{ id: string; name: string }>;

      // Common names for story points field
      const storyPointsNames = [
        'story points',
        'story point',
        'storypoints',
        'story point estimate',
        'punkte',
        'story-points'
      ];

      const field = fields.find(f =>
        storyPointsNames.includes(f.name.toLowerCase())
      );

      return { fieldId: field?.id || null };
    } catch (error) {
      return { fieldId: null, error: 'Netzwerkfehler beim Abrufen der Felder' };
    }
  }

  /**
   * Generate Basic Auth headers
   */
  private static getAuthHeaders(config: JiraConfig): Record<string, string> {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    };
  }
}
