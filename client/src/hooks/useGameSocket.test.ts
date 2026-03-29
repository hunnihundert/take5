import { renderHook, act } from '@testing-library/react';
import { useGameSocket } from './useGameSocket';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockSocket } from '../test/mockSocket';
import { RoomState } from '../types';

describe('useGameSocket', () => {
    let mockSocket: MockSocket;
    const initialRoomState: RoomState = {
        id: 'room-1',
        players: [
            { id: 'player-1', name: 'Player 1', avatar: '😀', isModerator: true, isObserver: false, hasVoted: false, selectedCard: null },
            { id: 'player-2', name: 'Player 2', avatar: '😎', isModerator: false, isObserver: false, hasVoted: false, selectedCard: null }
        ],
        currentPlayer: { id: 'player-1', name: 'Player 1', avatar: '😀', isModerator: true, isObserver: false, hasVoted: false, selectedCard: null },
        revealed: false,
        stories: [],
        activeStoryId: null
    };

    let roomState = initialRoomState;
    const setRoomState = vi.fn((update) => {
        if (typeof update === 'function') {
            roomState = update(roomState);
        } else {
            roomState = update;
        }
    });

    const setIncomingEmojis = vi.fn();

    beforeEach(() => {
        mockSocket = new MockSocket('player-1');
        roomState = initialRoomState;
        vi.clearAllMocks();
    });

    it('should register listeners on mount and unregister on unmount', () => {
        const { unmount } = renderHook(() => useGameSocket({
            socket: mockSocket as any,
            roomState,
            setRoomState,
            setIncomingEmojis
        }));

        expect(mockSocket.listeners['cardSelected']).toHaveLength(1);
        expect(mockSocket.listeners['cardsRevealed']).toHaveLength(1);
        expect(mockSocket.listeners['newRound']).toHaveLength(1);

        unmount();

        expect(mockSocket.listeners['cardSelected']).toBeUndefined();
        expect(mockSocket.listeners['cardsRevealed']).toBeUndefined();
    });

    it('should emit selectCard and update state optimistically', () => {
        const { result } = renderHook(() => useGameSocket({
            socket: mockSocket as any,
            roomState,
            setRoomState,
            setIncomingEmojis
        }));

        act(() => {
            result.current.selectCard('5');
        });

        expect(mockSocket.getLastEmitted()).toEqual({ event: 'selectCard', args: ['5'] });
        expect(roomState.currentPlayer?.selectedCard).toBe('5');
        expect(roomState.currentPlayer?.hasVoted).toBe(true);
    });

    it('should handle cardSelected from server', () => {
        renderHook(() => useGameSocket({
            socket: mockSocket as any,
            roomState,
            setRoomState,
            setIncomingEmojis
        }));

        act(() => {
            mockSocket.trigger('cardSelected', { playerId: 'player-2', hasVoted: true });
        });

        const player2 = roomState.players.find(p => p.id === 'player-2');
        expect(player2?.hasVoted).toBe(true);
    });

    it('should handle cardsRevealed from server', () => {
        renderHook(() => useGameSocket({
            socket: mockSocket as any,
            roomState,
            setRoomState,
            setIncomingEmojis
        }));

        const revealedPlayers = [
            { ...initialRoomState.players[0], selectedCard: '5', hasVoted: true },
            { ...initialRoomState.players[1], selectedCard: '8', hasVoted: true }
        ];

        act(() => {
            mockSocket.trigger('cardsRevealed', revealedPlayers);
        });

        expect(roomState.revealed).toBe(true);
        expect(roomState.players).toEqual(revealedPlayers);
    });

    it('should handle newRound from server', () => {
        // First set some state that should be cleared
        roomState = {
            ...initialRoomState,
            revealed: true,
            players: initialRoomState.players.map(p => ({ ...p, hasVoted: true, selectedCard: '5' })),
            currentPlayer: initialRoomState.currentPlayer ? { ...initialRoomState.currentPlayer, hasVoted: true, selectedCard: '5' } : null
        };

        renderHook(() => useGameSocket({
            socket: mockSocket as any,
            roomState,
            setRoomState,
            setIncomingEmojis
        }));

        act(() => {
            mockSocket.trigger('newRound');
        });

        expect(roomState.revealed).toBe(false);
        expect(roomState.players.every(p => !p.hasVoted && p.selectedCard === null)).toBe(true);
        expect(roomState.currentPlayer?.hasVoted).toBe(false);
        expect(roomState.currentPlayer?.selectedCard).toBeNull();
    });
});
