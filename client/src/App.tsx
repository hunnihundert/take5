import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { Player, RoomState, CardValue, Story } from './types';
import Home from './components/Home';
import GameRoom from './components/GameRoom';

interface IncomingEmoji {
  toPlayerId: string;
  emoji: string;
  id: string;
}

function App() {
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
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  const [incomingEmojis, setIncomingEmojis] = useState<IncomingEmoji[]>([]);

  // Read room code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomJoined', ({ roomCode, player, players, stories, activeStoryId, jiraConnected }) => {
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
      setRoomState(prev => ({
        ...prev,
        players: [...prev.players, player]
      }));
    });

    socket.on('playerLeft', (playerId: string) => {
      setRoomState(prev => {
        const updatedPlayers = prev.players.filter(p => p.id !== playerId);

        // Check if current player became moderator
        const updatedCurrentPlayer = prev.currentPlayer
          ? updatedPlayers.find(p => p.id === prev.currentPlayer!.id) || prev.currentPlayer
          : null;

        return {
          ...prev,
          players: updatedPlayers,
          currentPlayer: updatedCurrentPlayer
        };
      });
    });

    socket.on('cardSelected', ({ playerId, hasVoted }) => {
      setRoomState(prev => {
        const updatedPlayers = prev.players.map(p =>
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
      setRoomState(prev => {
        const updatedCurrentPlayer = players.find(p => p.id === prev.currentPlayer?.id) || prev.currentPlayer;
        return {
          ...prev,
          players,
          revealed: true,
          currentPlayer: updatedCurrentPlayer
        };
      });
    });

    socket.on('newRound', () => {
      setRoomState(prev => ({
        ...prev,
        players: prev.players.map(p => ({
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

    socket.on('observerToggled', ({ playerId, isObserver }) => {
      setRoomState(prev => {
        const updatedPlayers = prev.players.map(p =>
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

    socket.on('avatarUpdated', ({ playerId, avatarUrl }) => {
      setRoomState(prev => {
        const updatedPlayers = prev.players.map(p =>
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

    socket.on('emojiThrown', ({ toPlayerId, emoji }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setIncomingEmojis(prev => [...prev, { toPlayerId, emoji, id }]);
    });

    // Story event listeners
    socket.on('storyAdded', (story: Story) => {
      setRoomState(prev => ({
        ...prev,
        stories: [...prev.stories, story]
      }));
    });

    socket.on('storiesUpdated', (stories: Story[]) => {
      setRoomState(prev => {
        // Update activeStory if it still exists
        const activeStory = prev.activeStory
          ? stories.find(s => s.id === prev.activeStory!.id) || null
          : null;
        return {
          ...prev,
          stories,
          activeStory
        };
      });
    });

    socket.on('storySelected', ({ story }: { storyId: string; story: Story | null }) => {
      setRoomState(prev => ({
        ...prev,
        activeStory: story
      }));
    });

    socket.on('storyPointsApplied', ({ storyId, points }: { storyId: string; points: number }) => {
      setRoomState(prev => ({
        ...prev,
        stories: prev.stories.map(s =>
          s.id === storyId ? { ...s, storyPoints: points, voted: true } : s
        ),
        activeStory: prev.activeStory?.id === storyId
          ? { ...prev.activeStory, storyPoints: points, voted: true }
          : prev.activeStory
      }));
    });

    // Jira event listeners
    socket.on('jiraConfigured', () => {
      setRoomState(prev => ({
        ...prev,
        jiraConnected: true
      }));
    });

    socket.on('jiraDisconnected', () => {
      setRoomState(prev => ({
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

  const handleCreateRoom = (playerName: string) => {
    if (!socket) return;

    socket.emit('createRoom', playerName, (response: { success: boolean; roomCode?: string; error?: string }) => {
      if (!response.success) {
        alert(response.error || 'Fehler beim Erstellen des Raums');
      }
    });
  };

  const handleJoinRoom = (roomCode: string, playerName: string) => {
    if (!socket) return;

    socket.emit('joinRoom', { roomCode, playerName }, (response: { success: boolean; error?: string }) => {
      if (!response.success) {
        alert(response.error || 'Fehler beim Beitreten');
      }
    });
  };

  const handleSelectCard = (cardValue: CardValue) => {
    if (!socket || !roomState.currentPlayer) return;

    // Optimistically update local state immediately for instant feedback
    setRoomState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer ? {
        ...prev.currentPlayer,
        selectedCard: cardValue,
        hasVoted: true
      } : null
    }));

    // Send to server
    socket.emit('selectCard', cardValue);
  };

  const handleRevealCards = () => {
    if (!socket) return;
    socket.emit('revealCards');
  };

  const handleNewRound = () => {
    if (!socket) return;
    socket.emit('startNewRound');
  };

  const handleToggleObserver = () => {
    if (!socket) return;
    socket.emit('toggleObserver');
  };

  const handleUpdateAvatar = (avatarUrl: string | null) => {
    if (!socket) return;
    socket.emit('updateAvatar', avatarUrl);
  };

  const handleThrowEmoji = useCallback((toPlayerId: string, emoji: string) => {
    if (!socket) return;
    socket.emit('throwEmoji', { toPlayerId, emoji });
  }, [socket]);

  const handleRemoveIncomingEmoji = useCallback((id: string) => {
    setIncomingEmojis(prev => prev.filter(e => e.id !== id));
  }, []);

  // Story management handlers
  const handleAddManualStory = useCallback((summary: string) => {
    if (!socket) return;
    socket.emit('addManualStory', summary);
  }, [socket]);

  const handleRemoveStory = useCallback((storyId: string) => {
    if (!socket) return;
    socket.emit('removeStory', storyId);
  }, [socket]);

  const handleSelectStory = useCallback((storyId: string | null) => {
    if (!socket) return;
    socket.emit('selectStory', storyId);
  }, [socket]);

  const handleApplyStoryPoints = useCallback((storyId: string, points: number) => {
    if (!socket) return;
    socket.emit('applyStoryPoints', { storyId, points });
  }, [socket]);

  const handleClearStories = useCallback(() => {
    if (!socket) return;
    socket.emit('clearStories');
  }, [socket]);

  // Jira handlers
  const handleConfigureJira = useCallback((config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => {
    if (!socket) return;
    socket.emit('configureJira', config);
  }, [socket]);

  const handleDisconnectJira = useCallback(() => {
    if (!socket) return;
    socket.emit('disconnectJira');
  }, [socket]);

  const handleAddStoryByLink = useCallback((url: string) => {
    if (!socket) return;
    socket.emit('addStoryByLink', url);
  }, [socket]);

  const handleFetchJiraStories = useCallback((jql: string) => {
    if (!socket) return;
    socket.emit('fetchJiraStories', jql);
  }, [socket]);

  const handleRefreshJiraStories = useCallback(() => {
    if (!socket) return;
    socket.emit('refreshJiraStories');
  }, [socket]);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl">Verbinde mit Server...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!inRoom ? (
        <Home
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          initialRoomCode={initialRoomCode}
        />
      ) : (
        <GameRoom
          roomState={roomState}
          onSelectCard={handleSelectCard}
          onRevealCards={handleRevealCards}
          onNewRound={handleNewRound}
          onToggleObserver={handleToggleObserver}
          onUpdateAvatar={handleUpdateAvatar}
          onThrowEmoji={handleThrowEmoji}
          incomingEmojis={incomingEmojis}
          onRemoveIncomingEmoji={handleRemoveIncomingEmoji}
          onAddManualStory={handleAddManualStory}
          onRemoveStory={handleRemoveStory}
          onSelectStory={handleSelectStory}
          onApplyStoryPoints={handleApplyStoryPoints}
          onClearStories={handleClearStories}
          onConfigureJira={handleConfigureJira}
          onDisconnectJira={handleDisconnectJira}
          onAddStoryByLink={handleAddStoryByLink}
          onFetchJiraStories={handleFetchJiraStories}
          onRefreshJiraStories={handleRefreshJiraStories}
        />
      )}
    </div>
  );
}

export default App;
