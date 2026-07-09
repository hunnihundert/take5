import { AVATAR_LIMITS, DECK_LIMITS } from '@taking5/shared';

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
  avatarUrl: AVATAR_LIMITS,
  emoji: { max: 10 },
  jql: { max: 1000 },
  jiraBaseUrl: { max: 200 },
  jiraEmail: { max: 254 },
  jiraApiToken: { max: 500 },
  jiraFieldId: { max: 50 },
  jiraIssueUrl: { max: 300 },
  deckConfig: DECK_LIMITS,
};

// Canonical room-code format: 3-12 uppercase alphanumerics (after trim + uppercase).
export const ROOM_CODE_REGEX = /^[A-Z0-9]{3,12}$/;

export function isValidString(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

// Avatars come in two shapes: a link to an externally hosted image, or the image
// itself inlined as a base64 data URL from the avatar editor. Each gets its own cap.
export function validateAvatarUrl(v: unknown): { valid: true } | { valid: false; error: string } {
  if (typeof v !== 'string' || v.length === 0) return { valid: false, error: 'Avatar URL must be a non-empty string' };

  if (v.startsWith('data:')) {
    if (!AVATAR_LIMITS.allowedDataUrlPrefixes.some((prefix) => v.startsWith(prefix))) {
      return { valid: false, error: 'Avatar image must be a base64-encoded PNG, JPEG, or WebP' };
    }
    if (v.length > AVATAR_LIMITS.maxDataUrlLength) {
      return { valid: false, error: `Avatar image must be ${Math.floor(AVATAR_LIMITS.maxDataUrlLength / 1024)} KB or smaller` };
    }
    return { valid: true };
  }

  if (!v.startsWith('https://') && !v.startsWith('http://')) {
    return { valid: false, error: 'Avatar URL must start with http:// or https://' };
  }
  if (v.length > AVATAR_LIMITS.maxUrlLength) {
    return { valid: false, error: `Avatar URL must be ${AVATAR_LIMITS.maxUrlLength} characters or fewer` };
  }
  return { valid: true };
}

export function validateCardValues(values: unknown): { valid: true; values: string[] } | { valid: false; error: string } {
  if (!Array.isArray(values)) return { valid: false, error: 'Card values must be an array' };
  if (values.length < LIMITS.deckConfig.minValues) return { valid: false, error: `Deck must have at least ${LIMITS.deckConfig.minValues} ${LIMITS.deckConfig.minValues === 1 ? 'card' : 'cards'}` };
  if (values.length > LIMITS.deckConfig.maxValues) return { valid: false, error: `Deck can have at most ${LIMITS.deckConfig.maxValues} cards` };

  const trimmed: string[] = [];
  for (const v of values) {
    if (typeof v !== 'string') return { valid: false, error: 'Each card value must be a string' };
    const t = v.trim();
    if (t.length === 0) return { valid: false, error: 'Card values cannot be empty' };
    if (t.length > LIMITS.deckConfig.maxValueLength) return { valid: false, error: `Card values cannot exceed ${LIMITS.deckConfig.maxValueLength} characters` };
    trimmed.push(t);
  }

  if (new Set(trimmed).size !== trimmed.length) return { valid: false, error: 'Card values must be unique' };

  return { valid: true, values: trimmed };
}
