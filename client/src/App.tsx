
import { GameProvider, useGameContext } from './context/GameContext';
import Home from './components/Home';
import GameRoom from './components/GameRoom';

const GameContent = () => {
  const { connected, inRoom, createRoom, joinRoom } = useGameContext();

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
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          initialRoomCode={new URLSearchParams(window.location.search).get('room')?.toUpperCase() || ''}
        />
      ) : (
        <GameRoom /> // Props removed, GameRoom will consume context
      )}
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;
