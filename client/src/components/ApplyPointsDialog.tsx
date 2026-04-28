import { useState, useEffect } from 'react';
import { Story, Player } from '../types';
import { renderSummaryWithLinks } from '../utils/linkRenderer';

interface ApplyPointsDialogProps {
  isOpen: boolean;
  story: Story | null;
  players: Player[];
  revealed: boolean;
  cardValues: string[];
  onApplyPoints: (storyId: string, points: number) => void;
  onSkip: () => void;
  onClose: () => void;
}

const ApplyPointsDialog = ({
  isOpen,
  story,
  players,
  revealed,
  cardValues,
  onApplyPoints,
  onSkip,
  onClose
}: ApplyPointsDialogProps) => {
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);

  // Only numeric card values can be applied as story points
  const numericCardValues = cardValues.filter(v => isFinite(parseFloat(v)));

  // Calculate consensus using string equality (works for any card type)
  const activePlayers = players.filter(p => !p.isObserver && p.hasVoted);
  const selectedCards = activePlayers.map(p => p.selectedCard).filter(Boolean);
  const uniqueCards = [...new Set(selectedCards)];
  const hasConsensus = uniqueCards.length === 1 && selectedCards.length > 0;
  const consensusCard = hasConsensus ? uniqueCards[0] : null;
  const consensusValue = consensusCard !== null && isFinite(parseFloat(consensusCard!)) ? parseFloat(consensusCard!) : null;

  // Calculate average over numeric votes only
  const numericVotes = activePlayers
    .map(p => parseFloat(p.selectedCard || ''))
    .filter(v => isFinite(v));
  const average = numericVotes.length > 0
    ? Math.round(numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length)
    : null;

  // Find nearest card value for average
  const nearestValue = average !== null && numericCardValues.length > 0
    ? numericCardValues.reduce((prev, curr) =>
        Math.abs(parseFloat(curr) - average) < Math.abs(parseFloat(prev) - average) ? curr : prev
      )
    : null;

  // Reset selected points when dialog opens or story changes
  useEffect(() => {
    if (isOpen && story) {
      setSelectedPoints(consensusValue ?? (nearestValue !== null ? parseFloat(nearestValue) : null));
    }
  }, [isOpen, story?.id, consensusValue, nearestValue]);

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
            <h2 className="text-lg font-semibold text-gray-800">Assign Story Points</h2>
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
                  Consensus reached: {consensusCard}{consensusValue !== null ? ' Story Points' : ''}
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
                  No consensus{average !== null ? ` - Average: ${average}` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Point Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Story Points
            </label>
            <div className="flex flex-wrap gap-2">
              {numericCardValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedPoints(parseFloat(value))}
                  className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
                    selectedPoints === parseFloat(value)
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
              Skip
            </button>
            <button
              onClick={handleApply}
              disabled={selectedPoints === null}
              className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyPointsDialog;
