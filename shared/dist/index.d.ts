export type CardValue = '1' | '2' | '3' | '5' | '8' | '13';
export interface Story {
    id: string;
    key?: string;
    summary: string;
    storyPoints?: number;
    url?: string;
    isManual: boolean;
    voted: boolean;
}
export interface Player {
    id: string;
    name: string;
    selectedCard: CardValue | null;
    hasVoted: boolean;
    isModerator: boolean;
    isObserver: boolean;
    avatarUrl: string | null;
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
