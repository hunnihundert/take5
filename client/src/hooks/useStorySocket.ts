import { useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomState, Story } from '../types';

interface UseStorySocketProps {
    socket: Socket | null;
    setRoomState: React.Dispatch<React.SetStateAction<RoomState>>;
}

export const useStorySocket = ({ socket, setRoomState }: UseStorySocketProps) => {
    useEffect(() => {
        if (!socket) return;

        socket.on('storyAdded', (story: Story) => {
            setRoomState((prev: RoomState) => {
                // Remove any temporary optimistic story with the same summary
                const filteredStories = prev.stories.filter(s =>
                    !(s.id.startsWith('temp-') && s.summary === story.summary)
                );

                return {
                    ...prev,
                    stories: [...filteredStories, story]
                };
            });
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

        return () => {
            socket.off('storyAdded');
            socket.off('storiesUpdated');
            socket.off('storySelected');
            socket.off('storyPointsApplied');
        };
    }, [socket, setRoomState]);

    const addManualStory = useCallback((summary: string) => {
        if (!socket) return;

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempStory: Story = {
            id: tempId,
            summary,
            isManual: true,
            voted: false
        };

        setRoomState((prev) => ({
            ...prev,
            stories: [...prev.stories, tempStory]
        }));

        socket.emit('addManualStory', summary);
    }, [socket, setRoomState]);

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

    return { addManualStory, removeStory, selectStory, applyStoryPoints, clearStories };
};
