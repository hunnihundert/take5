import { useCallback, useEffect } from "react";
import { Socket } from "socket.io-client";
import {
    Player,
    RoomState,
    Story,
    DEFAULT_CARD_VALUES,
    getRandomDefaultAvatar,
} from "../types";

interface UseRoomSocketProps {
    socket: Socket | null;
    setRoomState: React.Dispatch<React.SetStateAction<RoomState>>;
    setInRoom: (inRoom: boolean) => void;
}

export const useRoomSocket = ({
    socket,
    setRoomState,
    setInRoom,
}: UseRoomSocketProps) => {
    useEffect(() => {
        if (!socket) return;

        socket.on(
            "roomJoined",
            ({
                roomCode,
                player,
                players,
                stories,
                activeStoryId,
                jiraConnected,
                cardValues,
            }: {
                roomCode: string;
                player: Player;
                players: Player[];
                stories: Story[];
                activeStoryId: string | null;
                jiraConnected: boolean;
                cardValues?: string[];
            }) => {
                const activeStory = activeStoryId
                    ? stories.find((s: Story) => s.id === activeStoryId) || null
                    : null;
                setRoomState({
                    roomCode,
                    currentPlayer: player,
                    players,
                    revealed: false,
                    stories: stories || [],
                    activeStory,
                    jiraConnected: jiraConnected || false,
                    cardValues: cardValues ?? DEFAULT_CARD_VALUES,
                });
                setInRoom(true);

                // Persist room code and player name to localStorage
                localStorage.setItem("take5_roomCode", roomCode);
                localStorage.setItem("take5_playerName", player.name);

                // Auto-restore avatar from localStorage. Three states: key
                // absent = user never chose, assign a sticky random default
                // (the avatarUpdated echo persists the pick); "" = user
                // explicitly removed their avatar, stay avatar-less;
                // otherwise restore the stored avatar.
                if (!player.avatarUrl) {
                    const storedAvatar =
                        localStorage.getItem("take5_avatarUrl");
                    if (storedAvatar === null) {
                        socket.emit(
                            "updateAvatar",
                            getRandomDefaultAvatar(),
                        );
                    } else if (storedAvatar !== "") {
                        socket.emit("updateAvatar", storedAvatar);
                    }
                }

                // Update URL with room code
                const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                window.history.pushState({ room: roomCode }, "", newUrl);
            },
        );

        socket.on("playerJoined", (player: Player) => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                players: [...prev.players, player],
            }));
        });

        socket.on(
            "playerLeft",
            ({
                playerId,
                newModeratorId,
            }: {
                playerId: string;
                newModeratorId?: string;
            }) => {
                setRoomState((prev: RoomState) => {
                    // Remove the player who left
                    let updatedPlayers = prev.players.filter(
                        (p: Player) => p.id !== playerId,
                    );

                    // Update moderator status if a new moderator was assigned
                    if (newModeratorId) {
                        updatedPlayers = updatedPlayers.map((p: Player) =>
                            p.id === newModeratorId
                                ? { ...p, isModerator: true }
                                : p,
                        );
                    }

                    // Update current player's moderator status if they became the new moderator
                    let updatedCurrentPlayer = prev.currentPlayer;
                    if (prev.currentPlayer) {
                        if (
                            newModeratorId &&
                            prev.currentPlayer.id === newModeratorId
                        ) {
                            updatedCurrentPlayer = {
                                ...prev.currentPlayer,
                                isModerator: true,
                            };
                        }
                    }

                    return {
                        ...prev,
                        players: updatedPlayers,
                        currentPlayer: updatedCurrentPlayer,
                    };
                });
            },
        );

        socket.on(
            "playerDisconnected",
            ({ playerId }: { playerId: string }) => {
                setRoomState((prev: RoomState) => ({
                    ...prev,
                    players: prev.players.map((p: Player) =>
                        p.id === playerId ? { ...p, disconnected: true } : p,
                    ),
                }));
            },
        );

        socket.on("playerReconnected", ({ playerId }: { playerId: string }) => {
            setRoomState((prev: RoomState) => ({
                ...prev,
                players: prev.players.map((p: Player) =>
                    p.id === playerId ? { ...p, disconnected: false } : p,
                ),
            }));
        });

        socket.on(
            "moderatorTransferred",
            ({
                fromPlayerId,
                toPlayerId,
            }: {
                fromPlayerId: string;
                toPlayerId: string;
            }) => {
                setRoomState((prev: RoomState) => {
                    const updatedPlayers = prev.players.map((p: Player) => ({
                        ...p,
                        isModerator:
                            p.id === toPlayerId
                                ? true
                                : p.id === fromPlayerId
                                  ? false
                                  : p.isModerator,
                    }));

                    let updatedCurrentPlayer = prev.currentPlayer;
                    if (prev.currentPlayer) {
                        if (prev.currentPlayer.id === toPlayerId) {
                            updatedCurrentPlayer = {
                                ...prev.currentPlayer,
                                isModerator: true,
                            };
                        } else if (prev.currentPlayer.id === fromPlayerId) {
                            updatedCurrentPlayer = {
                                ...prev.currentPlayer,
                                isModerator: false,
                            };
                        }
                    }

                    return {
                        ...prev,
                        players: updatedPlayers,
                        currentPlayer: updatedCurrentPlayer,
                    };
                });
            },
        );

        socket.on(
            "avatarUpdated",
            ({
                playerId,
                avatarUrl,
            }: {
                playerId: string;
                avatarUrl: string;
            }) => {
                setRoomState((prev: RoomState) => {
                    const updatedPlayers = prev.players.map((p: Player) =>
                        p.id === playerId ? { ...p, avatarUrl } : p,
                    );

                    const updatedCurrentPlayer =
                        prev.currentPlayer?.id === playerId &&
                        prev.currentPlayer
                            ? { ...prev.currentPlayer, avatarUrl }
                            : prev.currentPlayer;

                    // Persist own avatar to localStorage. An explicit removal
                    // is stored as "" so the next join stays avatar-less
                    // instead of assigning a new random default.
                    if (prev.currentPlayer?.id === playerId) {
                        localStorage.setItem(
                            "take5_avatarUrl",
                            avatarUrl ?? "",
                        );
                    }

                    return {
                        ...prev,
                        players: updatedPlayers,
                        currentPlayer: updatedCurrentPlayer,
                    };
                });
            },
        );

        socket.on("error", (message: string) => {
            alert(message);
        });

        return () => {
            socket.off("roomJoined");
            socket.off("playerJoined");
            socket.off("playerLeft");
            socket.off("playerDisconnected");
            socket.off("playerReconnected");
            socket.off("moderatorTransferred");
            socket.off("avatarUpdated");
            socket.off("error");
        };
    }, [socket, setRoomState, setInRoom]);

    const createRoom = useCallback(
        (playerName: string, roomCode?: string) => {
            if (!socket) return;
            socket.emit(
                "createRoom",
                playerName,
                roomCode,
                (response: {
                    success: boolean;
                    roomCode?: string;
                    error?: string;
                }) => {
                    if (!response.success) {
                        alert(response.error || "Failed to create room");
                    }
                },
            );
        },
        [socket],
    );

    const joinRoom = useCallback(
        (roomCode: string, playerName: string) => {
            if (!socket) return;
            socket.emit(
                "joinRoom",
                { roomCode, playerName },
                (response: { success: boolean; error?: string }) => {
                    if (!response.success) {
                        alert(response.error || "Failed to join room");
                    }
                },
            );
        },
        [socket],
    );

    const updateAvatar = useCallback(
        (avatarUrl: string | null) => {
            if (!socket) return;
            socket.emit("updateAvatar", avatarUrl);
        },
        [socket],
    );

    const transferModerator = useCallback(
        (toPlayerId: string) => {
            if (!socket) return;
            socket.emit("transferModerator", { toPlayerId });
        },
        [socket],
    );

    return { createRoom, joinRoom, updateAvatar, transferModerator };
};
