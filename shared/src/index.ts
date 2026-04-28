export type CardValue = string;

export const DECK_PRESETS = {
    fibonacci:    { label: 'Fibonacci',         values: ['1', '2', '3', '5', '8', '13', '21'] },
    modFibonacci: { label: 'Extended Fibonacci', values: ['0', '½', '1', '2', '3', '5', '8', '13', '21', '?'] },
    tshirt:       { label: 'T-Shirt Sizes',      values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    powersOf2:    { label: 'Powers of 2',        values: ['1', '2', '4', '8', '16', '32'] },
} as const;

export const DEFAULT_CARD_VALUES: string[] = [...DECK_PRESETS.fibonacci.values];

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
    cardValues: string[];
}

export interface JiraConfig {
    baseUrl: string;
    email: string;
    apiToken: string;
    storyPointsFieldId?: string;
}
