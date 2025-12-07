import { useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomState } from '../types';

interface UseJiraSocketProps {
    socket: Socket | null;
    setRoomState: React.Dispatch<React.SetStateAction<RoomState>>;
}

export const useJiraSocket = ({ socket, setRoomState }: UseJiraSocketProps) => {
    useEffect(() => {
        if (!socket) return;

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
            socket.off('jiraConfigured');
            socket.off('jiraDisconnected');
            socket.off('jiraError');
        };
    }, [socket, setRoomState]);

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

    return {
        configureJira,
        disconnectJira,
        addStoryByLink,
        fetchJiraStories,
        refreshJiraStories
    };
};
