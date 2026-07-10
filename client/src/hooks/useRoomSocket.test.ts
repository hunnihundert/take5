import { renderHook, act } from '@testing-library/react';
import { useRoomSocket } from './useRoomSocket';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockSocket } from '../test/mockSocket';
import { RoomState, DEFAULT_AVATARS } from '../types';

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
        localStorage.clear();
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

    it('should assign a random default avatar when the player has none and none is stored', () => {
        renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        const player = { id: 'player-1', name: 'Player 1', isModerator: true, avatarUrl: null };

        act(() => {
            mockSocket.trigger('roomJoined', {
                roomCode: 'ABCD',
                player,
                players: [player],
                stories: [],
                activeStoryId: null,
                jiraConnected: false
            });
        });

        const avatarEmit = mockSocket.emitted.find((e) => e.event === 'updateAvatar');
        expect(avatarEmit).toBeDefined();
        expect(DEFAULT_AVATARS).toContain(avatarEmit!.args[0]);
    });

    it('should restore the stored avatar instead of assigning a random default', () => {
        const storedAvatar = 'data:image/png;base64,AAA';
        localStorage.setItem('take5_avatarUrl', storedAvatar);

        renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        const player = { id: 'player-1', name: 'Player 1', isModerator: true, avatarUrl: null };

        act(() => {
            mockSocket.trigger('roomJoined', {
                roomCode: 'ABCD',
                player,
                players: [player],
                stories: [],
                activeStoryId: null,
                jiraConnected: false
            });
        });

        const avatarEmit = mockSocket.emitted.find((e) => e.event === 'updateAvatar');
        expect(avatarEmit).toBeDefined();
        expect(avatarEmit!.args[0]).toBe(storedAvatar);
    });

    it('should not re-send an avatar when the player already has one', () => {
        renderHook(() => useRoomSocket({
            socket: mockSocket as any,
            setRoomState,
            setInRoom
        }));

        const player = { id: 'player-1', name: 'Player 1', isModerator: true, avatarUrl: DEFAULT_AVATARS[0] };

        act(() => {
            mockSocket.trigger('roomJoined', {
                roomCode: 'ABCD',
                player,
                players: [player],
                stories: [],
                activeStoryId: null,
                jiraConnected: false
            });
        });

        expect(mockSocket.emitted.find((e) => e.event === 'updateAvatar')).toBeUndefined();
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
