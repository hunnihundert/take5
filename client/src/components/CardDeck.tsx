import { CardValue } from '../types';

interface CardDeckProps {
  selectedCard: CardValue | null;
  onSelectCard: (cardValue: CardValue) => void;
  disabled: boolean;
  cardValues: string[];
}

const CardDeck = ({ selectedCard, onSelectCard, disabled, cardValues }: CardDeckProps) => {
  const colCount = Math.min(cardValues.length, 6);
  return (
    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
      {cardValues.map((value) => {
        const isSelected = selectedCard === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onSelectCard(value)}
            disabled={disabled}
            className={`
              aspect-[2/3] rounded-xl border-3 font-bold text-3xl transition-all duration-300
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105 hover:shadow-lg'}
              ${
                isSelected
                  ? 'bg-primary-50 text-primary-700 border-primary-500 shadow-lg scale-105 ring-2 ring-primary-300 ring-opacity-50'
                  : 'bg-white text-gray-800 border-gray-300 hover:border-primary-400 hover:shadow-lg shadow-md'
              }
            `}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
};

export default CardDeck;
