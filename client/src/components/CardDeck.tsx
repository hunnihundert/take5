import { CardValue } from '../types';

interface CardDeckProps {
  selectedCard: CardValue | null;
  onSelectCard: (cardValue: CardValue) => void;
  disabled: boolean;
}

const CARD_VALUES: CardValue[] = ['1', '2', '3', '5', '8', '13'];

const CardDeck = ({ selectedCard, onSelectCard, disabled }: CardDeckProps) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
      {CARD_VALUES.map((value) => {
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
