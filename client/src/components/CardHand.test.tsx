import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import CardHand from './CardHand';

const cardValues = ['1', '2', '3', '5', '8', '13', '21'];

const baseProps = {
    selectedCard: null,
    onSelectCard: vi.fn(),
    disabled: false,
    cardValues,
};

describe('CardHand', () => {
    it('renders one card per deck value', () => {
        render(<CardHand {...baseProps} />);
        for (const value of cardValues) {
            expect(screen.getByRole('button', { name: value })).toBeInTheDocument();
        }
    });

    it('calls onSelectCard with the clicked value', () => {
        const onSelectCard = vi.fn();
        render(<CardHand {...baseProps} onSelectCard={onSelectCard} />);

        fireEvent.click(screen.getByRole('button', { name: '8' }));
        expect(onSelectCard).toHaveBeenCalledExactlyOnceWith('8');
    });

    it('marks only the selected card as pressed', () => {
        render(<CardHand {...baseProps} selectedCard="5" />);

        expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('does not call onSelectCard when disabled', () => {
        const onSelectCard = vi.fn();
        render(<CardHand {...baseProps} disabled onSelectCard={onSelectCard} />);

        fireEvent.click(screen.getByRole('button', { name: '8' }));
        expect(onSelectCard).not.toHaveBeenCalled();
    });

    it('renders custom decks of a single card without dividing by zero', () => {
        render(<CardHand {...baseProps} cardValues={['XL']} />);
        expect(screen.getByRole('button', { name: 'XL' })).toBeInTheDocument();
    });
});
