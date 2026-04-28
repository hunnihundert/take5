import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { DECK_PRESETS, DEFAULT_CARD_VALUES, DECK_LIMITS } from '../types';

interface DeckConfigModalProps {
  isOpen: boolean;
  currentCardValues: string[];
  hasActiveVotes: boolean;
  onSave: (cardValues: string[]) => void;
  onClose: () => void;
}

const PRESETS = Object.entries(DECK_PRESETS).map(([key, preset]) => ({ key, ...preset }));
const { maxValues: MAX_VALUES, maxValueLength: MAX_VALUE_LENGTH } = DECK_LIMITS;

const DeckConfigModal = ({ isOpen, currentCardValues, hasActiveVotes, onSave, onClose }: DeckConfigModalProps) => {
  const [values, setValues] = useState<string[]>([...currentCardValues]);
  const [customInput, setCustomInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValues([...currentCardValues]);
      setCustomInput('');
      setInputError('');
      // Detect if current values match a preset
      const matched = PRESETS.find(p => JSON.stringify(p.values) === JSON.stringify(currentCardValues));
      setActivePresetKey(matched?.key ?? null);
    }
  }, [isOpen, currentCardValues]);

  if (!isOpen) return null;

  const selectPreset = (key: string, presetValues: readonly string[]) => {
    setValues([...presetValues]);
    setActivePresetKey(key);
    setInputError('');
  };

  const addValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_VALUE_LENGTH) {
      setInputError(`Max ${MAX_VALUE_LENGTH} characters per card`);
      return;
    }
    if (values.includes(trimmed)) {
      setInputError(`"${trimmed}" is already in the deck`);
      return;
    }
    if (values.length >= MAX_VALUES) {
      setInputError(`Deck cannot exceed ${MAX_VALUES} cards`);
      return;
    }
    setValues(prev => [...prev, trimmed]);
    setActivePresetKey(null);
    setInputError('');
    setCustomInput('');
  };

  const removeValue = (index: number) => {
    setValues(prev => prev.filter((_, i) => i !== index));
    setActivePresetKey(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue(customInput);
    } else if (e.key === 'Backspace' && customInput === '' && values.length > 0) {
      removeValue(values.length - 1);
    }
  };

  const handleSave = () => {
    if (values.length === 0) {
      setInputError('Deck must have at least one card');
      return;
    }
    onSave(values);
    onClose();
  };

  const isCurrentDeck = JSON.stringify(values) === JSON.stringify(currentCardValues);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">Configure Card Deck</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Presets */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(({ key, label, values: presetValues }) => (
                <button
                  key={key}
                  onClick={() => selectPreset(key, presetValues)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                    activePresetKey === key
                      ? 'bg-primary-50 border-primary-400 text-primary-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="block">{label}</span>
                  <span className="block text-xs text-gray-400 mt-0.5 truncate">{presetValues.join(', ')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom deck builder */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Custom deck
              <span className="ml-2 text-xs text-gray-400 font-normal">{values.length}/{MAX_VALUES}</span>
            </p>

            {/* Tag-style input */}
            <div
              className="min-h-[48px] flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg focus-within:border-primary-400 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {values.map((v, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-800 rounded text-sm font-medium"
                >
                  {v}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeValue(i); }}
                    className="text-primary-500 hover:text-primary-700 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={customInput}
                onChange={e => { setCustomInput(e.target.value); setInputError(''); }}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (customInput.trim()) addValue(customInput); }}
                placeholder={values.length === 0 ? 'Type a value and press Enter…' : ''}
                className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
                disabled={values.length >= MAX_VALUES}
              />
            </div>
            {inputError && <p className="mt-1 text-xs text-red-600">{inputError}</p>}
            <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add. Backspace to remove last.</p>
          </div>

          {/* Preview */}
          {values.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
              <div className="flex flex-wrap gap-2">
                {values.map((v, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] w-10 flex items-center justify-center rounded-lg border-2 border-gray-300 bg-white text-gray-800 font-bold text-sm shadow-sm"
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning if votes would be cleared */}
          {hasActiveVotes && !isCurrentDeck && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Changing the deck will reset all current votes.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setValues([...DEFAULT_CARD_VALUES]); setActivePresetKey('fibonacci'); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to default
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={values.length === 0 || isCurrentDeck}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckConfigModal;
