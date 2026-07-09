import { useState } from 'react';
import { CardValue } from '../types';

interface CardHandProps {
  selectedCard: CardValue | null;
  onSelectCard: (cardValue: CardValue) => void;
  disabled: boolean;
  cardValues: string[];
}

// Cards fanned out like a hand held at the table edge. Each card gets a small
// rotation, and the arc is built by lifting cards toward the center of the
// fan rather than dipping the edges: scrollable overflow only ever extends
// downward, so keeping all movement upward (into the top padding) is what
// keeps the bar itself from becoming vertically scrollable. The fan flattens
// and overlap tightens as the deck grows so large custom decks (up to 20
// values) still fit on one row.
const CardHand = ({ selectedCard, onSelectCard, disabled, cardValues }: CardHandProps) => {
  // The keyboard-focused card must render above the neighbor overlapping it,
  // or its focus ring is partially hidden.
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const n = cardValues.length;
  const mid = (n - 1) / 2;
  const totalSpreadDeg = Math.min(32, n * 4);
  const stepDeg = n > 1 ? totalSpreadDeg / (n - 1) : 0;
  const maxLiftPx = Math.min(14, n * 2);
  const overlapPx = n <= 8 ? 10 : n <= 14 ? 20 : 28;

  return (
    // pb-2.5 covers the corners of the outermost rotated cards, which extend
    // slightly below the baseline; everything else moves up, not down.
    <div
      role="group"
      aria-label="Card hand"
      className="flex justify-center items-end overflow-x-auto pt-8 pb-2.5 px-6"
    >
      {cardValues.map((value, i) => {
        const isSelected = selectedCard === value;
        const offset = mid > 0 ? (i - mid) / mid : 0; // -1 .. 1 across the fan
        const rotate = (i - mid) * stepDeg;
        const lift = (1 - offset * offset) * maxLiftPx;
        return (
          <div
            key={value}
            className="shrink-0"
            style={{
              transform: `rotate(${rotate}deg) translateY(${-lift}px)`,
              transformOrigin: 'bottom center',
              zIndex: focusedIndex === i ? 60 : isSelected ? 50 : i,
              marginLeft: i === 0 ? 0 : -overlapPx,
            }}
          >
            <button
              onClick={() => !disabled && onSelectCard(value)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex((prev) => (prev === i ? null : prev))}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`
                block w-12 sm:w-14 aspect-[2/3] rounded-lg border-2 font-bold text-lg sm:text-xl
                transition-transform duration-200 motion-reduce:transition-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${
                  isSelected
                    ? 'bg-primary-50 text-primary-700 border-primary-500 shadow-xl ring-2 ring-primary-300 ring-opacity-50 -translate-y-4'
                    : 'bg-white text-gray-800 border-gray-300 shadow-md hover:-translate-y-3 hover:shadow-lg hover:border-primary-400 focus-visible:-translate-y-3 focus-visible:shadow-lg focus-visible:border-primary-400 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0'
                }
              `}
            >
              {value}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CardHand;
