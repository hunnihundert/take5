export type CardValue = string;

export const DECK_PRESETS = {
    fibonacci: {
        label: "Fibonacci",
        values: ["1", "2", "3", "5", "8", "13", "21"],
    },
    modFibonacci: {
        label: "Extended Fibonacci",
        values: ["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "?"],
    },
    tshirt: {
        label: "T-Shirt Sizes",
        values: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    powersOf2: {
        label: "Powers of 2",
        values: ["1", "2", "4", "8", "16", "32"],
    },
} as const;

export const DEFAULT_CARD_VALUES: string[] = [...DECK_PRESETS.fibonacci.values];

export const DECK_LIMITS = {
    minValues: 1,
    maxValues: 20,
    maxValueLength: 8,
} as const;

export const AVATAR_LIMITS = {
    // Plain http(s) links to externally hosted images
    maxUrlLength: 500,
    // Inline data URLs produced by the avatar editor (base64-encoded image bytes).
    // Kept small because avatars are broadcast to every player in the room.
    maxDataUrlLength: 64 * 1024,
    allowedDataUrlPrefixes: [
        "data:image/png;base64,",
        "data:image/jpeg;base64,",
        "data:image/webp;base64,",
    ],
} as const;

// Built-in avatars shipped with the client (served from client/public/avatars).
// The server whitelists exactly these paths in validateAvatarUrl, so renaming
// or adding a file must be reflected here.
export const DEFAULT_AVATARS = [
    "/avatars/bison-arbeiten.svg",
    "/avatars/bison-buehne.svg",
    "/avatars/bison-cocktail.svg",
    "/avatars/bison-fernglas.svg",
    "/avatars/bison-halten.svg",
    "/avatars/bison-jubel.svg",
    "/avatars/bison-karneval.svg",
    "/avatars/bison-koffer.svg",
    "/avatars/bison-kopf.svg",
    "/avatars/bison-nachdenklich.svg",
    "/avatars/bison-zeigen.svg",
] as const;

export function getRandomDefaultAvatar(): string {
    return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}

export interface Story {
    id: string;
    key?: string; // Jira issue key (e.g., "PROJ-123")
    summary: string;
    storyPoints?: number;
    url?: string; // Jira issue URL
    isManual: boolean; // true if added manually, false if from Jira
    voted: boolean; // true if story has been estimated
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
