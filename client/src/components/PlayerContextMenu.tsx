import { useEffect, useRef } from 'react';

interface PlayerContextMenuProps {
  x: number;
  y: number;
  playerName: string;
  onThrowEmoji: () => void;
  onClose: () => void;
  showMakeModerator?: boolean;
  onMakeModerator?: () => void;
}

const PlayerContextMenu = ({ x, y, playerName, onThrowEmoji, onClose, showMakeModerator, onMakeModerator }: PlayerContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const menuHeight = showMakeModerator && onMakeModerator ? 140 : 100;
  const adjustedStyle = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - menuHeight),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] animate-fadeIn"
      style={adjustedStyle}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-xs text-gray-500">Player: </span>
        <span className="text-sm font-medium text-gray-800">{playerName}</span>
      </div>
      <button
        onClick={() => {
          onThrowEmoji();
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center gap-2 transition-colors"
      >
        <span className="text-lg">🎯</span>
        <span>Throw emoji</span>
      </button>
      {showMakeModerator && onMakeModerator && (
        <button
          onClick={() => {
            onMakeModerator?.();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-2 transition-colors"
        >
          <span className="text-lg">👑</span>
          <span>Make moderator</span>
        </button>
      )}
    </div>
  );
};

export default PlayerContextMenu;
