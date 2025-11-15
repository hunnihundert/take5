import { useEffect } from 'react';
import { Player } from '../types';
import { triggerConfetti } from '../utils/confetti';

interface PokerTableProps {
  players: Player[];
  currentPlayerId: string;
  revealed: boolean;
}

const PokerTable = ({ players, currentPlayerId, revealed }: PokerTableProps) => {
  // Filter out observers for calculations
  const activePlayers = players.filter(p => !p.isObserver);

  // Check if all active players selected the same card (consensus)
  useEffect(() => {
    if (!revealed) return;

    const playersWithCards = activePlayers.filter(p => p.selectedCard !== null);

    if (playersWithCards.length > 1) {
      const firstCard = playersWithCards[0].selectedCard;
      const allSame = playersWithCards.every(p => p.selectedCard === firstCard);

      if (allSame) {
        // Trigger confetti after a short delay
        setTimeout(() => {
          triggerConfetti();
        }, 300);
      }
    }
  }, [revealed, activePlayers]);

  const calculateAverage = () => {
    const numericVotes = activePlayers
      .map(p => p.selectedCard)
      .filter(card => card !== null)
      .map(card => parseFloat(card!));

    if (numericVotes.length === 0) return null;

    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    const avg = sum / numericVotes.length;
    return avg.toFixed(1);
  };

  // Check for consensus
  const playersWithCards = activePlayers.filter(p => p.selectedCard !== null);
  const cardValues = [...new Set(playersWithCards.map(p => p.selectedCard))];
  const hasConsensus = playersWithCards.length > 1 && cardValues.length === 1;

  const average = calculateAverage();

  // Calculate position for each player around the table
  const getPlayerPosition = (index: number, total: number) => {
    // Distribute players evenly around an ellipse
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2; // Start from top

    // Ellipse parameters (adjusted for better spacing)
    const radiusX = 42; // Horizontal radius in percentage
    const radiusY = 38; // Vertical radius in percentage

    const x = 50 + radiusX * Math.cos(angle);
    const y = 50 + radiusY * Math.sin(angle);

    return { x, y, angle };
  };

  return (
    <div className="relative w-full h-full min-h-[600px] flex items-center justify-center">
      {/* Poker Table */}
      <div className="relative w-full max-w-4xl aspect-[4/3]">
        {/* Table surface */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[70%] h-[60%] bg-gradient-to-br from-green-700 via-green-600 to-green-700 rounded-[50%] border-8 border-amber-900 shadow-2xl relative">
            {/* Table texture */}
            <div className="absolute inset-0 rounded-[50%] opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]"></div>

            {/* Center content - Results or decoration */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              {revealed ? (
                <div className="text-center animate-fadeIn">
                  {hasConsensus ? (
                    <div className="bg-white/95 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border-2 border-green-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-lg font-bold text-green-800">Konsens!</p>
                        <div className="text-5xl font-bold text-green-600 my-2">{cardValues[0]}</div>
                        <p className="text-sm text-gray-600">Alle sind sich einig</p>
                      </div>
                    </div>
                  ) : average !== null ? (
                    <div className="bg-white/95 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border-2 border-primary-400">
                      <p className="text-sm text-gray-600 mb-2">Durchschnitt</p>
                      <div className="text-6xl font-bold text-primary-700">{average}</div>
                      <p className="text-xs text-gray-500 mt-2">{playersWithCards.length} Stimmen</p>
                    </div>
                  ) : (
                    <div className="bg-white/95 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border-2 border-gray-300">
                      <p className="text-gray-600">Keine Stimmen</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-green-800 opacity-30 text-6xl font-bold">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Players around the table */}
        {players.map((player, index) => {
          const { x, y } = getPlayerPosition(index, players.length);
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <div
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              <div className={`flex flex-col items-center gap-2 ${isCurrentPlayer ? 'scale-110' : ''}`}>
                {/* Avatar */}
                <div className={`relative ${isCurrentPlayer ? 'ring-4 ring-primary-400 ring-offset-2' : ''} rounded-full`}>
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 shadow-lg">
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={`${player.name} Avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-300 to-gray-400">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Vote indicator */}
                  {player.hasVoted && !revealed && (
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Observer indicator */}
                  {player.isObserver && (
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-purple-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Player info card */}
                <div className={`
                  bg-white rounded-lg shadow-lg px-4 py-2 min-w-[140px]
                  ${isCurrentPlayer ? 'bg-primary-50 border-2 border-primary-400' : 'border border-gray-200'}
                `}>
                  {/* Name and badges */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-semibold text-gray-800 text-sm text-center truncate max-w-full">
                      {player.name}
                    </div>

                    {/* Badges row */}
                    <div className="flex gap-1 flex-wrap justify-center">
                      {player.isModerator && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                          MOD
                        </span>
                      )}
                      {player.isObserver && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                          BEOB
                        </span>
                      )}
                      {isCurrentPlayer && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-800 text-xs rounded-full font-medium">
                          Du
                        </span>
                      )}
                    </div>

                    {/* Card display */}
                    {player.hasVoted && !revealed && (
                      <div className="mt-1">
                        <div className="inline-flex items-center justify-center w-10 h-14 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-bold text-lg rounded-md shadow-md border-2 border-gray-700">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {revealed && player.selectedCard && (
                      <div className="mt-1 animate-flipIn">
                        <div className="inline-block px-3 py-1.5 bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-xl rounded-md shadow-md">
                          {player.selectedCard}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PokerTable;
