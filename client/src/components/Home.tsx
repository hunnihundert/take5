import { useState, useEffect } from 'react';

interface HomeProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  initialRoomCode?: string;
}

const Home = ({ onCreateRoom, onJoinRoom, initialRoomCode }: HomeProps) => {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // If initialRoomCode is provided, pre-fill and switch to join mode
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      setMode('join');
    }
  }, [initialRoomCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert('Bitte gib deinen Namen ein');
      return;
    }

    if (mode === 'create') {
      onCreateRoom(playerName.trim());
    } else if (mode === 'join') {
      if (!roomCode.trim()) {
        alert('Bitte gib einen Raum-Code ein');
        return;
      }
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          Planning Poker
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Agile Schätzung im Team
        </p>

        {mode === 'select' ? (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105"
            >
              Neuen Raum erstellen
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105"
            >
              Raum beitreten
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dein Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Dein Name"
                autoFocus
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raum-Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none uppercase"
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('select');
                  setPlayerName('');
                  setRoomCode('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                Zurück
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {mode === 'create' ? 'Erstellen' : 'Beitreten'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Home;
