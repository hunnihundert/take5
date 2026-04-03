import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import PlayerContextMenu from './PlayerContextMenu';

const baseProps = {
    x: 100,
    y: 100,
    playerName: 'Alice',
    onThrowEmoji: vi.fn(),
    onClose: vi.fn(),
};

describe('PlayerContextMenu', () => {
    it('always shows the Emoji werfen option', () => {
        render(<PlayerContextMenu {...baseProps} />);
        expect(screen.getByText('Emoji werfen')).toBeDefined();
    });

    it('does NOT show "Zum Moderator machen" when showMakeModerator is false', () => {
        render(<PlayerContextMenu {...baseProps} showMakeModerator={false} />);
        expect(screen.queryByText('Zum Moderator machen')).toBeNull();
    });

    it('does NOT show "Zum Moderator machen" when showMakeModerator is omitted', () => {
        render(<PlayerContextMenu {...baseProps} />);
        expect(screen.queryByText('Zum Moderator machen')).toBeNull();
    });

    it('shows "Zum Moderator machen" when showMakeModerator is true (current player is moderator)', () => {
        render(<PlayerContextMenu {...baseProps} showMakeModerator={true} onMakeModerator={vi.fn()} />);
        expect(screen.getByText('Zum Moderator machen')).toBeDefined();
    });

    it('calls onMakeModerator when "Zum Moderator machen" is clicked', () => {
        const onMakeModerator = vi.fn();
        render(<PlayerContextMenu {...baseProps} showMakeModerator={true} onMakeModerator={onMakeModerator} />);

        fireEvent.click(screen.getByText('Zum Moderator machen'));
        expect(onMakeModerator).toHaveBeenCalledOnce();
    });

    it('calls onThrowEmoji when "Emoji werfen" is clicked', () => {
        const onThrowEmoji = vi.fn();
        render(<PlayerContextMenu {...baseProps} onThrowEmoji={onThrowEmoji} showMakeModerator={true} />);

        fireEvent.click(screen.getByText('Emoji werfen'));
        expect(onThrowEmoji).toHaveBeenCalledOnce();
    });
});
