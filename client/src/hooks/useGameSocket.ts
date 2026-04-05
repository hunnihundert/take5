import { useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { CardValue, Player, RoomState } from '../types';

interface IncomingEmoji {
    toPlayerId: string;
    emoji: string;
    id: string;
}

interface UseGameSocketProps {
    socket: Socket | null;
    sessionId: string | null;
    roomState: RoomState;
    setRoomState: React.Dispatch<React.SetStateAction<RoomState>>;
    setIncomingEmojis: React.Dispatch<React.SetStateAction<IncomingEmoji[]>>;
}

export const useGameSocket = ({ socket, sessionId, roomState, setRoomState, setIncomingEmojis }: UseGameSocketProps) => {
    useEffect(() => {
        if (!socket) return;

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

        socket.on('emojiThrown', ({ fromPlayerId, toPlayerId, emoji }: { fromPlayerId: string; toPlayerId: string; emoji: string }) => {
            // Ignore own emojis as they are handled optimistically
            if (fromPlayerId === sessionId) return;

            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setIncomingEmojis((prev: IncomingEmoji[]) => {
                const updated = [...prev, { toPlayerId, emoji, id }];
                // Cap list size to 20 to prevent performance issues
                return updated.slice(-20);
            });
        });

        return () => {
            socket.off('cardSelected');
            socket.off('cardsRevealed');
            socket.off('newRound');
            socket.off('observerToggled');
            socket.off('emojiThrown');
        };
    }, [socket, setRoomState, setIncomingEmojis]);

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
    }, [socket, roomState.currentPlayer, setRoomState]);

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

    const throwEmoji = useCallback((toPlayerId: string, emoji: string) => {
        if (!socket) return;

        // Optimistic update
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setIncomingEmojis((prev: IncomingEmoji[]) => {
            const updated = [...prev, { toPlayerId, emoji, id }];
            return updated.slice(-20);
        });

        socket.emit('throwEmoji', { toPlayerId, emoji });
    }, [socket, setIncomingEmojis]);

    return { selectCard, revealCards, startNewRound, toggleObserver, throwEmoji };
};
