export const CAPS = {
  maxRooms: 500,
  maxPlayersPerRoom: 20,
  maxStoriesPerRoom: 200,
  maxActiveSessions: 2000,
};

export const LIMITS = {
  playerName: { min: 1, max: 50 },
  roomCode: { min: 3, max: 12 },
  storySummary: { min: 1, max: 500 },
  avatarUrl: { max: 500 },
  emoji: { max: 10 },
  jql: { max: 1000 },
  jiraBaseUrl: { max: 200 },
  jiraEmail: { max: 254 },
  jiraApiToken: { max: 500 },
  jiraFieldId: { max: 50 },
  jiraIssueUrl: { max: 300 },
};

export function isValidString(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}
