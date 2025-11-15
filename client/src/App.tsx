import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { Player, RoomState, CardValue } from './types';
import Home from './components/Home';
import GameRoom from './components/GameRoom';

function App() {
  const { socket, connected } = useSocket();
  const [roomState, setRoomState] = useState<RoomState>({
    roomCode: '',
    currentPlayer: null,
    players: [],
    revealed: false
  });
  const [inRoom, setInRoom] = useState(false);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

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

    socket.on('roomJoined', ({ roomCode, player, players }) => {
      setRoomState({
        roomCode,
        currentPlayer: player,
        players,
        revealed: false
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
        />
      )}
    </div>
  );
}

export default App;
