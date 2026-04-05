export type CardValue = '1' | '2' | '3' | '5' | '8' | '13';

export interface Story {
    id: string;
    key?: string;           // Jira issue key (e.g., "PROJ-123")
    summary: string;
    storyPoints?: number;
    url?: string;           // Jira issue URL
    isManual: boolean;      // true if added manually, false if from Jira
    voted: boolean;         // true if story has been estimated
}

export interface Player {
    id: string;
    name: string;
    selectedCard: CardValue | null;
    hasVoted: boolean;
    isModerator: boolean;
    isObserver: boolean;
    avatarUrl: string | null;
    disconnected?: boolean;
}

export interface RoomState {
    roomCode: string;
    currentPlayer: Player | null;
    players: Player[];
    revealed: boolean;
    stories: Story[];
    activeStory: Story | null;
    jiraConnected: boolean;
}

export interface JiraConfig {
    baseUrl: string;
    email: string;
    apiToken: string;
    storyPointsFieldId?: string;
}
