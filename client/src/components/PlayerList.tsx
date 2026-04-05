import { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  revealed: boolean;
}

const PlayerList = ({ players, currentPlayerId, revealed }: PlayerListProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Players ({players.length})
      </h2>
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200
              ${player.id === currentPlayerId ? 'bg-primary-50 border-primary-300' : 'bg-gray-50 border-gray-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300 border-2 border-gray-400 flex-shrink-0">
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={`${player.name} Avatar`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {player.name}
                  </span>
                  {player.isModerator && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      MOD
                    </span>
                  )}
                  {player.isObserver && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      OBSERVER
                    </span>
                  )}
                  {player.id === currentPlayerId && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-800 text-xs rounded-full">
                      You
                    </span>
                  )}
                </div>
                {player.hasVoted && !revealed && (
                  <div className="mt-2">
                    <div className="inline-flex items-center justify-center w-12 h-16 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-bold text-2xl rounded-lg shadow-lg border-2 border-gray-700">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      </svg>
                    </div>
                  </div>
                )}
                {revealed && player.selectedCard && (
                  <div className="mt-2 animate-flipIn">
                    <span className="inline-block px-4 py-2 bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-lg rounded-lg shadow-lg">
                      {player.selectedCard}
                    </span>
                  </div>
                )}
              </div>
              <div>
                {player.hasVoted ? (
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full">
                    <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
