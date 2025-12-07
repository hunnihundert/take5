import { useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Player, RoomState, Story } from '../types';

interface UseRoomSocketProps {
    socket: Socket | null;
    setRoomState: React.Dispatch<React.SetStateAction<RoomState>>;
    setInRoom: (inRoom: boolean) => void;
}

export const useRoomSocket = ({ socket, setRoomState, setInRoom }: UseRoomSocketProps) => {
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

        return () => {
            socket.off('roomJoined');
            socket.off('playerJoined');
            socket.off('playerLeft');
            socket.off('avatarUpdated');
            socket.off('error');
        };
    }, [socket, setRoomState, setInRoom]);

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

    const updateAvatar = useCallback((avatarUrl: string | null) => {
        if (!socket) return;
        socket.emit('updateAvatar', avatarUrl);
    }, [socket]);

    return { createRoom, joinRoom, updateAvatar };
};
