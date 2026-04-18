import { useEffect, useRef, useState } from 'react';

const EMOJI_CATEGORIES = {
  'Funny': ['💩', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😈', '👿', '🙈', '🙉', '🙊', '💣', '🧨', '🪤', '🚀', '🛸', '🌪️', '⚡', '🔮', '🧲', '🧪', '🧫', '🦠', '🧬', '🃏', '🀄', '🎭'],
  'Numbers': ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '💯', '🔢', '#️⃣', '*️⃣', '➕', '➖', '➗', '✖️', '♾️', '💲', '💰', '💵', '💸', '🏧', '📊', '📈', '📉'],
  'Faces': ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😜', '🤪', '😎', '🤓', '🧐', '😤', '😡', '🤯', '😱', '🥺', '😭', '😴', '🤔', '🙄', '😏', '🤗', '🤫', '🤥', '😬', '🙃', '😇', '🥳', '🤩', '🥴', '🤢', '🤮', '🤧', '😵', '😵‍💫', '🤠', '🥶', '🥵', '😶‍🌫️'],
  'Gestures': ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '✍️', '🤳', '💅', '🖕', '👊', '🤛', '🤜', '🫵', '🫶'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❤️‍🔥', '❤️‍🩹', '💋', '😻', '😽'],
  'Objects': ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💨', '💦', '💤', '🎯', '🎲', '🎮', '🕹️', '🎸', '🎺', '🎷', '🥁', '🎤', '🪩', '🎪', '🎠'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🥓', '🥐', '🍞', '🥖', '🥨', '🧁', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '🍭', '☕', '🍵', '🍺', '🍻', '🥂', '🍷', '🌶️', '🍌', '🍆'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', '🐝', '🦋', '🐌', '🐛', '🐙', '🦑', '🦐', '🦖', '🦕', '🐊'],
  'Nature': ['🌸', '🌺', '🌻', '🌹', '🥀', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '🌾', '🌿', '☀️', '🌙', '⭐', '🌈', '⛅', '☁️', '❄️', '💧', '🌊'],
};

const RECENT_EMOJIS_KEY = 'planning-poker-recent-emojis';
const MAX_RECENT_EMOJIS = 5;

interface EmojiPickerProps {
  x: number;
  y: number;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker = ({ x, y, onSelect, onClose }: EmojiPickerProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Funny');

  useEffect(() => {
    // Load recent emojis from localStorage
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch {
        setRecentEmojis([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
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

  const handleEmojiSelect = (emoji: string) => {
    // Update recent emojis
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT_EMOJIS);
    setRecentEmojis(newRecent);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(newRecent));

    onSelect(emoji);
  };

  // Adjust position to keep picker in viewport
  const pickerWidth = 320;
  const pickerHeight = 400;
  const adjustedStyle = {
    left: Math.min(Math.max(x - pickerWidth / 2, 10), window.innerWidth - pickerWidth - 10),
    top: Math.min(Math.max(y, 10), window.innerHeight - pickerHeight - 10),
  };

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn"
      style={{ ...adjustedStyle, width: pickerWidth, maxHeight: pickerHeight }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Throw emoji</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recent Emojis */}
      {recentEmojis.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="text-xs text-gray-500 mb-1">Recently used</div>
          <div className="flex gap-1">
            {recentEmojis.map((emoji, index) => (
              <button
                key={`recent-${index}`}
                onClick={() => handleEmojiSelect(emoji)}
                className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-primary-100 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/30 px-1 py-1 gap-1">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-2 overflow-y-auto" style={{ maxHeight: 220 }}>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
            <button
              key={`${selectedCategory}-${index}`}
              onClick={() => handleEmojiSelect(emoji)}
              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-primary-100 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
