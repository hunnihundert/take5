import { Story, JiraConfig, Player, RoomState, CardValue } from '@taking5/shared';

// Re-export common types
export { Story, JiraConfig, Player, RoomState, CardValue };

export interface Room {
  code: string;
  players: Map<string, Player>;
  revealed: boolean;
  createdAt: Date;
  stories: Story[];
  activeStoryId?: string;
  jiraConfig?: JiraConfig;
}

export interface ServerToClientEvents {
  roomJoined: (data: { roomCode: string; player: Player; players: Player[]; stories: Story[]; activeStoryId: string | null; jiraConnected: boolean }) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (data: { playerId: string; newModeratorId?: string }) => void;
  moderatorTransferred: (data: { fromPlayerId: string; toPlayerId: string }) => void;
  cardSelected: (data: { playerId: string; hasVoted: boolean }) => void;
  cardsRevealed: (players: Player[]) => void;
  newRound: () => void;
  observerToggled: (data: { playerId: string; isObserver: boolean }) => void;
  avatarUpdated: (data: { playerId: string; avatarUrl: string | null }) => void;
  emojiThrown: (data: { fromPlayerId: string; toPlayerId: string; emoji: string }) => void;
  storyAdded: (story: Story) => void;
  storiesUpdated: (stories: Story[]) => void;
  storySelected: (data: { storyId: string; story: Story | null }) => void;
  storyPointsApplied: (data: { storyId: string; points: number }) => void;
  jiraConfigured: (data: { baseUrl: string }) => void;
  jiraDisconnected: () => void;
  jiraError: (data: { code: string; message: string }) => void;
  sessionCreated: (data: { sessionId: string }) => void;
  playerDisconnected: (data: { playerId: string }) => void;
  playerReconnected: (data: { playerId: string }) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (
    playerName: string,
    roomCode: string | undefined,
    callback: (response: { success: boolean; roomCode?: string; error?: string }) => void
  ) => void;
  joinRoom: (data: { roomCode: string; playerName: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  selectCard: (cardValue: CardValue) => void;
  revealCards: () => void;
  startNewRound: () => void;
  toggleObserver: () => void;
  updateAvatar: (avatarUrl: string | null) => void;
  throwEmoji: (data: { toPlayerId: string; emoji: string }) => void;
  transferModerator: (data: { toPlayerId: string }) => void;
  leaveRoom: () => void;

  // Story events
  addManualStory: (summary: string) => void;
  removeStory: (storyId: string) => void;
  selectStory: (storyId: string | null) => void;
  applyStoryPoints: (data: { storyId: string; points: number }) => void;
  clearStories: () => void;

  // Jira events
  configureJira: (config: JiraConfig) => void;
  disconnectJira: () => void;
  addStoryByLink: (url: string) => void;
  fetchJiraStories: (jql: string) => void;
  refreshJiraStories: () => void;
}
