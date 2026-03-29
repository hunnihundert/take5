import { useState, useEffect } from 'react';
import { Story, Player, CardValue } from '../types';
import { renderSummaryWithLinks } from '../utils/linkRenderer';

interface ApplyPointsDialogProps {
  isOpen: boolean;
  story: Story | null;
  players: Player[];
  revealed: boolean;
  onApplyPoints: (storyId: string, points: number) => void;
  onSkip: () => void;
  onClose: () => void;
}

const CARD_VALUES: CardValue[] = ['1', '2', '3', '5', '8', '13'];

const ApplyPointsDialog = ({
  isOpen,
  story,
  players,
  revealed,
  onApplyPoints,
  onSkip,
  onClose
}: ApplyPointsDialogProps) => {
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);

  // Calculate consensus and average
  const activePlayers = players.filter(p => !p.isObserver && p.hasVoted);
  const votes = activePlayers.map(p => parseInt(p.selectedCard || '0'));
  const uniqueVotes = [...new Set(votes.filter(v => v > 0))];
  const hasConsensus = uniqueVotes.length === 1;
  const consensusValue = hasConsensus ? uniqueVotes[0] : null;

  // Calculate average
  const validVotes = votes.filter(v => v > 0);
  const average = validVotes.length > 0
    ? Math.round(validVotes.reduce((a, b) => a + b, 0) / validVotes.length)
    : null;

  // Find nearest Fibonacci value for average
  const nearestFibonacci = average !== null
    ? CARD_VALUES.reduce((prev, curr) =>
        Math.abs(parseInt(curr) - average) < Math.abs(parseInt(prev) - average) ? curr : prev
      )
    : null;

  // Reset selected points when dialog opens or story changes
  useEffect(() => {
    if (isOpen && story) {
      setSelectedPoints(consensusValue || (nearestFibonacci ? parseInt(nearestFibonacci) : null));
    }
  }, [isOpen, story?.id, consensusValue, nearestFibonacci]);

  if (!isOpen || !story || !revealed) return null;

  const handleApply = () => {
    if (selectedPoints !== null) {
      onApplyPoints(story.id, selectedPoints);
      onClose();
    }
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Story Points vergeben</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Story Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            {story.key && (
              <span className="text-xs font-mono bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded mr-2">
                {story.key}
              </span>
            )}
            <div className="text-sm text-gray-800 mt-1">
              {renderSummaryWithLinks(story.summary)}
            </div>
          </div>

          {/* Consensus Message */}
          {hasConsensus ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  Konsens erreicht: {consensusValue} Story Points
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  Kein Konsens - Durchschnitt: {average || '-'}
                </span>
              </div>
            </div>
          )}

          {/* Point Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Story Points wählen
            </label>
            <div className="flex flex-wrap gap-2">
              {CARD_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedPoints(parseInt(value))}
                  className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
                    selectedPoints === parseInt(value)
                      ? 'bg-primary-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Überspringen
            </button>
            <button
              onClick={handleApply}
              disabled={selectedPoints === null}
              className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
            >
              Anwenden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyPointsDialog;
