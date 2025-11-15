import { useEffect } from 'react';
import { Player } from '../types';
import { triggerConfetti } from '../utils/confetti';

interface ResultsProps {
  players: Player[];
}

const Results = ({ players }: ResultsProps) => {
  // Filter out observers
  const activePlayers = players.filter(p => !p.isObserver);

  // Check if all active players selected the same card (consensus)
  useEffect(() => {
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
  }, [activePlayers]);

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

  const average = calculateAverage();

  // Group active players by their selected card
  const cardGroups = activePlayers.reduce((acc, player) => {
    if (!player.selectedCard) return acc;

    if (!acc[player.selectedCard]) {
      acc[player.selectedCard] = [];
    }
    acc[player.selectedCard].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  // Sort card values
  const sortedCards = Object.keys(cardGroups).sort((a, b) => {
    return parseFloat(a) - parseFloat(b);
  });

  // Check for consensus
  const playersWithCards = activePlayers.filter(p => p.selectedCard !== null);
  const hasConsensus = playersWithCards.length > 1 && sortedCards.length === 1;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Ergebnisse</h2>

      {hasConsensus && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 animate-scaleIn">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-lg font-bold text-green-800">Konsens erreicht!</p>
              <p className="text-sm text-green-700">Alle Spieler sind sich einig: {sortedCards[0]} Punkte</p>
            </div>
          </div>
        </div>
      )}

      {average !== null && !hasConsensus && (
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border-2 border-primary-200 animate-scaleIn">
          <p className="text-sm text-gray-600 mb-1">Durchschnitt</p>
          <p className="text-4xl font-bold text-primary-700">{average}</p>
        </div>
      )}

      <div className="space-y-3">
        {sortedCards.map((cardValue, index) => (
          <div
            key={cardValue}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 animate-slideInUp"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 bg-primary-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg">
                {cardValue}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">
                  {cardGroups[cardValue].length} {cardGroups[cardValue].length === 1 ? 'Spieler' : 'Spieler'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cardGroups[cardValue].map(player => (
                    <span
                      key={player.id}
                      className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-300"
                    >
                      {player.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activePlayers.some(p => !p.selectedCard) && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Hinweis:</span> Einige Spieler haben keine Karte gewählt.
          </p>
        </div>
      )}

      {players.filter(p => p.isObserver).length > 0 && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800">
            <span className="font-semibold">Beobachter:</span> {players.filter(p => p.isObserver).map(p => p.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Results;
