import { render, act } from '@testing-library/react';
import { GameProvider, useGameContext } from './GameContext';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { useRoomSocket } from '../hooks/useRoomSocket';

// Variable to capture setInRoom from the mock
let capturedSetInRoom: ((inRoom: boolean) => void) | undefined;

// Mock the hooks used in GameContext
vi.mock('../hooks/useSocket', () => ({
    useSocket: vi.fn(() => ({ socket: { id: 'test-socket' }, connected: true }))
}));

vi.mock('../hooks/useRoomSocket', () => ({
    useRoomSocket: vi.fn(({ setInRoom }) => {
        capturedSetInRoom = setInRoom;
        return {
            createRoom: vi.fn(),
            joinRoom: vi.fn(),
            updateAvatar: vi.fn()
        };
    })
}));

vi.mock('../hooks/useGameSocket', () => ({
    useGameSocket: vi.fn(() => ({
        selectCard: vi.fn(),
        revealCards: vi.fn(),
        startNewRound: vi.fn(),
        toggleObserver: vi.fn(),
        throwEmoji: vi.fn()
    }))
}));

vi.mock('../hooks/useStorySocket', () => ({
    useStorySocket: vi.fn(() => ({
        addManualStory: vi.fn(),
        removeStory: vi.fn(),
        selectStory: vi.fn(),
        applyStoryPoints: vi.fn(),
        clearStories: vi.fn()
    }))
}));

vi.mock('../hooks/useJiraSocket', () => ({
    useJiraSocket: vi.fn(() => ({
        configureJira: vi.fn(),
        disconnectJira: vi.fn(),
        addStoryByLink: vi.fn(),
        fetchJiraStories: vi.fn(),
        refreshJiraStories: vi.fn()
    }))
}));

// Component to help trigger inRoom state change
const TestComponent = ({ shouldBeInRoom }: { shouldBeInRoom: boolean }) => {
    const { inRoom } = useGameContext();

    useEffect(() => {
        if (capturedSetInRoom) {
            capturedSetInRoom(shouldBeInRoom);
        }
    }, [shouldBeInRoom]);

    return <div data-testid="in-room-status">{inRoom ? 'in-room' : 'not-in-room'}</div>;
};

describe('GameContext Heartbeat', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
        capturedSetInRoom = undefined;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should start heartbeat when inRoom is true', async () => {
        const { rerender } = render(
            <GameProvider>
                <TestComponent shouldBeInRoom={false} />
            </GameProvider>
        );

        expect(fetch).not.toHaveBeenCalled();

        // Change to inRoom: true
        rerender(
            <GameProvider>
                <TestComponent shouldBeInRoom={true} />
            </GameProvider>
        );

        // Advance time by 10 minutes
        act(() => {
            vi.advanceTimersByTime(10 * 60 * 1000);
        });

        expect(fetch).toHaveBeenCalled();
        const fetchUrl = (fetch as any).mock.calls[0][0];
        expect(fetchUrl).toContain('/api/health');
    });

    it('should not start heartbeat when not in room', () => {
        render(
            <GameProvider>
                <TestComponent shouldBeInRoom={false} />
            </GameProvider>
        );

        act(() => {
            vi.advanceTimersByTime(10 * 60 * 1000);
        });

        expect(fetch).not.toHaveBeenCalled();
    });

    it('should stop heartbeat when leaving room', () => {
        const { rerender } = render(
            <GameProvider>
                <TestComponent shouldBeInRoom={true} />
            </GameProvider>
        );

        // Verify it starts
        act(() => {
            vi.advanceTimersByTime(10 * 60 * 1000);
        });
        expect(fetch).toHaveBeenCalledTimes(1);

        // Leave room
        rerender(
            <GameProvider>
                <TestComponent shouldBeInRoom={false} />
            </GameProvider>
        );

        // Advance another 10 minutes
        act(() => {
            vi.advanceTimersByTime(10 * 60 * 1000);
        });

        // Should still be 1 (from previous call)
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
