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
  deckConfig: { minValues: 1, maxValues: 20, maxValueLength: 8 },
};

export function isValidString(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

export function validateCardValues(values: unknown): { valid: true; values: string[] } | { valid: false; error: string } {
  if (!Array.isArray(values)) return { valid: false, error: 'Card values must be an array' };
  if (values.length < LIMITS.deckConfig.minValues) return { valid: false, error: `Deck must have at least ${LIMITS.deckConfig.minValues} card` };
  if (values.length > LIMITS.deckConfig.maxValues) return { valid: false, error: `Deck can have at most ${LIMITS.deckConfig.maxValues} cards` };

  for (const v of values) {
    if (typeof v !== 'string') return { valid: false, error: 'Each card value must be a string' };
    if (v.trim().length === 0) return { valid: false, error: 'Card values cannot be empty' };
    if (v.length > LIMITS.deckConfig.maxValueLength) return { valid: false, error: `Card values cannot exceed ${LIMITS.deckConfig.maxValueLength} characters` };
  }

  const trimmed = values.map((v: string) => v.trim());
  if (new Set(trimmed).size !== trimmed.length) return { valid: false, error: 'Card values must be unique' };

  return { valid: true, values: trimmed };
}
