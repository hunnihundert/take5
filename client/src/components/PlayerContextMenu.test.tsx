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
    it('always shows the Throw emoji option', () => {
        render(<PlayerContextMenu {...baseProps} />);
        expect(screen.getByText('Throw emoji')).toBeInTheDocument();
    });

    it('does NOT show "Make moderator" when showMakeModerator is false', () => {
        render(<PlayerContextMenu {...baseProps} showMakeModerator={false} />);
        expect(screen.queryByText('Make moderator')).toBeNull();
    });

    it('does NOT show "Make moderator" when showMakeModerator is omitted', () => {
        render(<PlayerContextMenu {...baseProps} />);
        expect(screen.queryByText('Make moderator')).toBeNull();
    });

    it('shows "Make moderator" when showMakeModerator is true (current player is moderator)', () => {
        render(<PlayerContextMenu {...baseProps} showMakeModerator={true} onMakeModerator={vi.fn()} />);
        expect(screen.getByText('Make moderator')).toBeInTheDocument();
    });

    it('calls onMakeModerator when "Make moderator" is clicked', () => {
        const onMakeModerator = vi.fn();
        render(<PlayerContextMenu {...baseProps} showMakeModerator={true} onMakeModerator={onMakeModerator} />);

        fireEvent.click(screen.getByText('Make moderator'));
        expect(onMakeModerator).toHaveBeenCalledOnce();
    });

    it('calls onThrowEmoji when "Throw emoji" is clicked', () => {
        const onThrowEmoji = vi.fn();
        render(<PlayerContextMenu {...baseProps} onThrowEmoji={onThrowEmoji} showMakeModerator={true} />);

        fireEvent.click(screen.getByText('Throw emoji'));
        expect(onThrowEmoji).toHaveBeenCalledOnce();
    });
});
