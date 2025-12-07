import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Player, RoomState, CardValue, Story } from '../types';

interface IncomingEmoji {
    toPlayerId: string;
    emoji: string;
    id: string;
}

interface GameContextType {
    connected: boolean;
    roomState: RoomState;
    inRoom: boolean;
    incomingEmojis: IncomingEmoji[];
    createRoom: (playerName: string) => void;
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
    const { socket, connected } = useSocket();
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
    const [incomingEmojis, setIncomingEmojis] = useState<IncomingEmoji[]>([]);

    // Read room code from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam) {
            // Logic to handle auto-join flow could be added here or handled by the component
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('roomJoined', ({ roomCode, player, players, stories, activeStoryId, jiraConnected }: {
            roomCode: string;
            player: Player;
            players: Player[];
            stories: Story[];
            activeStoryId: string | null;
            jiraConnected: boolean;
        }) => {
            const activeStory = activeStoryId ? stories.find((s: Story) => s.id === activeStoryId) || null : null;
            setRoomState({
                roomCode,
                currentPlayer: player,
                players,
                revealed: false,
                stories: stories || [],
                activeStory,
                jiraConnected: jiraConnected || false
            });
            setInRoom(true);

            // Update URL with room code
            const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
            window.history.pushState({ room: roomCode }, '', newUrl);
        });

        socket.on('playerJoined', (player: Player) => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                players: [...prev.players, player]
            }));
        });

        socket.on('playerLeft', (playerId: string) => {
            setRoomState((prev: RoomState) => {
                const updatedPlayers = prev.players.filter((p: Player) => p.id !== playerId);

                // Check if current player became moderator
                const updatedCurrentPlayer = prev.currentPlayer
                    ? updatedPlayers.find((p: Player) => p.id === prev.currentPlayer!.id) || prev.currentPlayer
                    : null;

                return {
                    ...prev,
                    players: updatedPlayers,
                    currentPlayer: updatedCurrentPlayer
                };
            });
        });

        socket.on('cardSelected', ({ playerId, hasVoted }: { playerId: string; hasVoted: boolean }) => {
            setRoomState((prev: RoomState) => {
                const updatedPlayers = prev.players.map((p: Player) =>
                    p.id === playerId ? { ...p, hasVoted } : p
                );
                const updatedCurrentPlayer = prev.currentPlayer?.id === playerId && prev.currentPlayer
                    ? { ...prev.currentPlayer, hasVoted }
                    : prev.currentPlayer;

                return {
                    ...prev,
                    players: updatedPlayers,
                    currentPlayer: updatedCurrentPlayer
                };
            });
        });

        socket.on('cardsRevealed', (players: Player[]) => {
            setRoomState((prev: RoomState) => {
                const updatedCurrentPlayer = players.find((p: Player) => p.id === prev.currentPlayer?.id) || prev.currentPlayer;
                return {
                    ...prev,
                    players,
                    revealed: true,
                    currentPlayer: updatedCurrentPlayer
                };
            });
        });

        socket.on('newRound', () => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                players: prev.players.map((p: Player) => ({
                    ...p,
                    selectedCard: null,
                    hasVoted: false
                })),
                currentPlayer: prev.currentPlayer ? {
                    ...prev.currentPlayer,
                    selectedCard: null,
                    hasVoted: false
                } : null,
                revealed: false
            }));
        });

        socket.on('observerToggled', ({ playerId, isObserver }: { playerId: string; isObserver: boolean }) => {
            setRoomState((prev: RoomState) => {
                const updatedPlayers = prev.players.map((p: Player) =>
                    p.id === playerId ? { ...p, isObserver, hasVoted: false, selectedCard: null } : p
                );

                const updatedCurrentPlayer = prev.currentPlayer?.id === playerId && prev.currentPlayer
                    ? { ...prev.currentPlayer, isObserver, hasVoted: false, selectedCard: null }
                    : prev.currentPlayer;

                return {
                    ...prev,
                    players: updatedPlayers,
                    currentPlayer: updatedCurrentPlayer
                };
            });
        });

        socket.on('avatarUpdated', ({ playerId, avatarUrl }: { playerId: string; avatarUrl: string }) => {
            setRoomState((prev: RoomState) => {
                const updatedPlayers = prev.players.map((p: Player) =>
                    p.id === playerId ? { ...p, avatarUrl } : p
                );

                const updatedCurrentPlayer = prev.currentPlayer?.id === playerId && prev.currentPlayer
                    ? { ...prev.currentPlayer, avatarUrl }
                    : prev.currentPlayer;

                return {
                    ...prev,
                    players: updatedPlayers,
                    currentPlayer: updatedCurrentPlayer
                };
            });
        });

        socket.on('error', (message: string) => {
            alert(message);
        });

        socket.on('emojiThrown', ({ toPlayerId, emoji }: { toPlayerId: string; emoji: string }) => {
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setIncomingEmojis((prev: IncomingEmoji[]) => [...prev, { toPlayerId, emoji, id }]);
        });

        // Story event listeners
        socket.on('storyAdded', (story: Story) => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                stories: [...prev.stories, story]
            }));
        });

        socket.on('storiesUpdated', (stories: Story[]) => {
            setRoomState((prev: RoomState) => {
                // Update activeStory if it still exists
                const activeStory = prev.activeStory
                    ? stories.find((s: Story) => s.id === prev.activeStory!.id) || null
                    : null;
                return {
                    ...prev,
                    stories,
                    activeStory
                };
            });
        });

        socket.on('storySelected', ({ story }: { storyId: string; story: Story | null }) => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                activeStory: story
            }));
        });

        socket.on('storyPointsApplied', ({ storyId, points }: { storyId: string; points: number }) => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                stories: prev.stories.map((s: Story) =>
                    s.id === storyId ? { ...s, storyPoints: points, voted: true } : s
                ),
                activeStory: prev.activeStory?.id === storyId
                    ? { ...prev.activeStory, storyPoints: points, voted: true }
                    : prev.activeStory
            }));
        });

        // Jira event listeners
        socket.on('jiraConfigured', () => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                jiraConnected: true
            }));
        });

        socket.on('jiraDisconnected', () => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                jiraConnected: false
            }));
        });

        socket.on('jiraError', ({ message }: { code: string; message: string }) => {
            alert(`Jira Fehler: ${message}`);
        });

        return () => {
            socket.off('roomJoined');
            socket.off('playerJoined');
            socket.off('playerLeft');
            socket.off('cardSelected');
            socket.off('cardsRevealed');
            socket.off('newRound');
            socket.off('observerToggled');
            socket.off('avatarUpdated');
            socket.off('error');
            socket.off('emojiThrown');
            socket.off('storyAdded');
            socket.off('storiesUpdated');
            socket.off('storySelected');
            socket.off('storyPointsApplied');
            socket.off('jiraConfigured');
            socket.off('jiraDisconnected');
            socket.off('jiraError');
        };
    }, [socket]);

    const createRoom = useCallback((playerName: string) => {
        if (!socket) return;
        socket.emit('createRoom', playerName, (response: { success: boolean; roomCode?: string; error?: string }) => {
            if (!response.success) {
                alert(response.error || 'Fehler beim Erstellen des Raums');
            }
        });
    }, [socket]);

    const joinRoom = useCallback((roomCode: string, playerName: string) => {
        if (!socket) return;
        socket.emit('joinRoom', { roomCode, playerName }, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                alert(response.error || 'Fehler beim Beitreten');
            }
        });
    }, [socket]);

    const selectCard = useCallback((cardValue: CardValue) => {
        if (!socket || !roomState.currentPlayer) return;

        // Optimistically update local state
        setRoomState((prev: RoomState) => ({
            ...prev,
            currentPlayer: prev.currentPlayer ? {
                ...prev.currentPlayer,
                selectedCard: cardValue,
                hasVoted: true
            } : null
        }));

        socket.emit('selectCard', cardValue);
    }, [socket, roomState.currentPlayer]);

    const revealCards = useCallback(() => {
        if (!socket) return;
        socket.emit('revealCards');
    }, [socket]);

    const startNewRound = useCallback(() => {
        if (!socket) return;
        socket.emit('startNewRound');
    }, [socket]);

    const toggleObserver = useCallback(() => {
        if (!socket) return;
        socket.emit('toggleObserver');
    }, [socket]);

    const updateAvatar = useCallback((avatarUrl: string | null) => {
        if (!socket) return;
        socket.emit('updateAvatar', avatarUrl);
    }, [socket]);

    const throwEmoji = useCallback((toPlayerId: string, emoji: string) => {
        if (!socket) return;
        socket.emit('throwEmoji', { toPlayerId, emoji });
    }, [socket]);

    const removeIncomingEmoji = useCallback((id: string) => {
        setIncomingEmojis((prev: IncomingEmoji[]) => prev.filter(e => e.id !== id));
    }, []);

    const addManualStory = useCallback((summary: string) => {
        if (!socket) return;
        socket.emit('addManualStory', summary);
    }, [socket]);

    const removeStory = useCallback((storyId: string) => {
        if (!socket) return;
        socket.emit('removeStory', storyId);
    }, [socket]);

    const selectStory = useCallback((storyId: string | null) => {
        if (!socket) return;
        socket.emit('selectStory', storyId);
    }, [socket]);

    const applyStoryPoints = useCallback((storyId: string, points: number) => {
        if (!socket) return;
        socket.emit('applyStoryPoints', { storyId, points });
    }, [socket]);

    const clearStories = useCallback(() => {
        if (!socket) return;
        socket.emit('clearStories');
    }, [socket]);

    const configureJira = useCallback((config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => {
        if (!socket) return;
        socket.emit('configureJira', config);
    }, [socket]);

    const disconnectJira = useCallback(() => {
        if (!socket) return;
        socket.emit('disconnectJira');
    }, [socket]);

    const addStoryByLink = useCallback((url: string) => {
        if (!socket) return;
        socket.emit('addStoryByLink', url);
    }, [socket]);

    const fetchJiraStories = useCallback((jql: string) => {
        if (!socket) return;
        socket.emit('fetchJiraStories', jql);
    }, [socket]);

    const refreshJiraStories = useCallback(() => {
        if (!socket) return;
        socket.emit('refreshJiraStories');
    }, [socket]);

    const value = {
        connected,
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
