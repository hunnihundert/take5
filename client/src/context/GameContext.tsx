import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket, BACKEND_URL } from '../hooks/useSocket';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { useGameSocket } from '../hooks/useGameSocket';
import { useStorySocket } from '../hooks/useStorySocket';
import { useJiraSocket } from '../hooks/useJiraSocket';
import { RoomState, CardValue } from '../types';

const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const RECONNECT_TIMEOUT_MS = 3_000; // 3 seconds to wait for auto-rejoin

interface IncomingEmoji {
    toPlayerId: string;
    emoji: string;
    id: string;
}

interface GameContextType {
    connected: boolean;
    reconnecting: boolean;
    roomState: RoomState;
    inRoom: boolean;
    incomingEmojis: IncomingEmoji[];
    createRoom: (playerName: string, roomCode?: string) => void;
    joinRoom: (roomCode: string, playerName: string) => void;
    selectCard: (cardValue: CardValue) => void;
    revealCards: () => void;
    startNewRound: () => void;
    toggleObserver: () => void;
    updateAvatar: (avatarUrl: string | null) => void;
    throwEmoji: (toPlayerId: string, emoji: string) => void;
    removeIncomingEmoji: (id: string) => void;

    // Story management
    addManualStory: (summary: string) => void;
    removeStory: (storyId: string) => void;
    selectStory: (storyId: string | null) => void;
    applyStoryPoints: (storyId: string, points: number) => void;
    clearStories: () => void;

    // Jira integration
    configureJira: (config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => void;
    disconnectJira: () => void;
    addStoryByLink: (url: string) => void;
    fetchJiraStories: (jql: string) => void;
    refreshJiraStories: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { socket, connected, sessionId } = useSocket();
    const [roomState, setRoomState] = useState<RoomState>({
        roomCode: '',
        currentPlayer: null,
        players: [],
        revealed: false,
        stories: [],
        activeStory: null,
        jiraConnected: false
    });
    const [inRoom, setInRoom] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [incomingEmojis, setIncomingEmojis] = useState<IncomingEmoji[]>([]);

    // Detect if we might be reconnecting (have a stored session + room in URL)
    useEffect(() => {
        if (connected && !inRoom) {
            const hasStoredSession = !!localStorage.getItem('take5_sessionId');
            const params = new URLSearchParams(window.location.search);
            const hasRoomParam = !!params.get('room');

            if (hasStoredSession && hasRoomParam) {
                setReconnecting(true);

                // Give the server time to auto-rejoin via roomJoined event
                const timeout = setTimeout(() => {
                    setReconnecting(false);
                }, RECONNECT_TIMEOUT_MS);

                return () => clearTimeout(timeout);
            }
        }
    }, [connected, inRoom]);

    // Clear reconnecting state when we successfully join a room
    useEffect(() => {
        if (inRoom) {
            setReconnecting(false);
        }
    }, [inRoom]);

    // Heartbeat to keep Render instance alive when in a room
    useEffect(() => {
        if (!inRoom) return;

        // Send a heartbeat every 10 minutes to prevent Render from sleeping
        // Render free tier spins down after 15 minutes of inactivity
        const heartbeatInterval = setInterval(() => {
            const baseUrl = BACKEND_URL.replace(/\/socket\.io\/?$/, '').replace(/\/+$/, '');
            fetch(`${baseUrl}/api/health`)
                .then(response => {
                    if (!response.ok) {
                        console.error(
                            'Heartbeat failed: non-2xx response',
                            response.status,
                            response.statusText
                        );
                    }
                })
                .catch(err => console.error('Heartbeat failed (network error):', err));
        }, HEARTBEAT_INTERVAL_MS);

        return () => clearInterval(heartbeatInterval);
    }, [inRoom]);

    // Initialize logic hooks
    const { createRoom, joinRoom, updateAvatar } = useRoomSocket({ socket, setRoomState, setInRoom });
    const { selectCard, revealCards, startNewRound, toggleObserver, throwEmoji } = useGameSocket({
        socket,
        sessionId,
        roomState,
        setRoomState,
        setIncomingEmojis
    });
    const { addManualStory, removeStory, selectStory, applyStoryPoints, clearStories } = useStorySocket({ socket, setRoomState });
    const { configureJira, disconnectJira, addStoryByLink, fetchJiraStories, refreshJiraStories } = useJiraSocket({ socket, setRoomState });

    const removeIncomingEmoji = useCallback((id: string) => {
        setIncomingEmojis((prev: IncomingEmoji[]) => prev.filter(e => e.id !== id));
    }, []);

    const value = {
        connected,
        reconnecting,
        roomState,
        inRoom,
        incomingEmojis,
        createRoom,
        joinRoom,
        selectCard,
        revealCards,
        startNewRound,
        toggleObserver,
        updateAvatar,
        throwEmoji,
        removeIncomingEmoji,
        addManualStory,
        removeStory,
        selectStory,
        applyStoryPoints,
        clearStories,
        configureJira,
        disconnectJira,
        addStoryByLink,
        fetchJiraStories,
        refreshJiraStories
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGameContext = () => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};
