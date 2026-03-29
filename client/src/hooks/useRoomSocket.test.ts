import { renderHook, act } from '@testing-library/react';
import { useRoomSocket } from './useRoomSocket';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockSocket } from '../test/mockSocket';
import { RoomState } from '../types';

describe('useRoomSocket', () => {
    let mockSocket: MockSocket;
    const initialRoomState: RoomState = {
        roomCode: '',
        currentPlayer: null,
        players: [],
        revealed: false,
        stories: [],
        activeStory: null,
        jiraConnected: false
    };

    let roomState = initialRoomState;
    const setRoomState = vi.fn((update) => {
        if (typeof update === 'function') {
            roomState = update(roomState);
        } else {
            roomState = update;
        }
    });

    const setInRoom = vi.fn();

    beforeEach(() => {
        mockSocket = new MockSocket('player-1');
        roomState = initialRoomState;
        vi.clearAllMocks();
        // Mock window.history.pushState
        vi.stubGlobal('history', { pushState: vi.fn() });
        vi.stubGlobal('location', { origin: 'http://localhost:3000', pathname: '/' });
    });

    it('should register listeners on mount', () => {
        renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        expect(mockSocket.listeners['roomJoined']).toHaveLength(1);
        expect(mockSocket.listeners['playerJoined']).toHaveLength(1);
        expect(mockSocket.listeners['playerLeft']).toHaveLength(1);
    });

    it('should handle roomJoined from server', () => {
        renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        const player = { id: 'player-1', name: 'Player 1', isModerator: true };
        const players = [player];

        act(() => {
            mockSocket.trigger('roomJoined', {
                roomCode: 'ABCD',
                player,
                players,
                stories: [],
                activeStoryId: null,
                jiraConnected: false
            });
        });

        expect(roomState.roomCode).toBe('ABCD');
        expect(roomState.currentPlayer).toEqual(player);
        expect(roomState.players).toEqual(players);
        expect(setInRoom).toHaveBeenCalledWith(true);
        expect(history.pushState).toHaveBeenCalled();
    });

    it('should handle playerJoined from server', () => {
        roomState = { ...initialRoomState, players: [{ id: 'p1', name: 'P1', isModerator: true }] };

        renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        const newPlayer = { id: 'p2', name: 'P2', isModerator: false };

        act(() => {
            mockSocket.trigger('playerJoined', newPlayer);
        });

        expect(roomState.players).toHaveLength(2);
        expect(roomState.players[1]).toEqual(newPlayer);
    });

    it('should emit createRoom', () => {
        const { result } = renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        act(() => {
            result.current.createRoom('Test Name');
        });

        expect(mockSocket.getLastEmitted().event).toBe('createRoom');
        expect(mockSocket.getLastEmitted().args[0]).toBe('Test Name');
    });
});
