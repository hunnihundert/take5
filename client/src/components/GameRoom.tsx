import { useState, useRef } from 'react';
import { RoomState, CardValue } from '../types';
import PlayerList from './PlayerList';
import CardDeck from './CardDeck';
import Results from './Results';
import AvatarEditor from './AvatarEditor';

interface GameRoomProps {
  roomState: RoomState;
  onSelectCard: (cardValue: CardValue) => void;
  onRevealCards: () => void;
  onNewRound: () => void;
  onToggleObserver: () => void;
  onUpdateAvatar: (avatarUrl: string | null) => void;
}

const GameRoom = ({ roomState, onSelectCard, onRevealCards, onNewRound, onToggleObserver, onUpdateAvatar }: GameRoomProps) => {
  const { roomCode, currentPlayer, players, revealed } = roomState;
  const [copied, setCopied] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Bitte wähle eine Bilddatei aus');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Das Bild ist zu groß. Bitte wähle eine Datei unter 5MB');
      return;
    }

    // Convert to base64 and show editor
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedImageUrl(base64String);
      setShowAvatarEditor(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    event.target.value = '';
  };

  const handleAvatarSave = (croppedImage: string) => {
    onUpdateAvatar(croppedImage);
    setShowAvatarEditor(false);
    setSelectedImageUrl('');
  };

  const handleAvatarCancel = () => {
    setShowAvatarEditor(false);
    setSelectedImageUrl('');
  };

  const handleRemoveAvatar = () => {
    onUpdateAvatar(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
                  {currentPlayer?.avatarUrl ? (
                    <img
                      src={currentPlayer.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Avatar overlay with buttons */}
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={handleAvatarClick}
                    className="p-1.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Avatar ändern"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {currentPlayer?.avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="p-1.5 bg-white rounded-full hover:bg-gray-100 transition-colors ml-1"
                      title="Avatar entfernen"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Name and badges */}
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Planning Poker</h1>
                <p className="text-gray-600 mt-1">
                  Willkommen, <span className="font-semibold">{currentPlayer?.name}</span>
                  {currentPlayer?.isModerator && (
                    <span className="ml-2 px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                      Moderator
                    </span>
                  )}
                  {currentPlayer?.isObserver && (
                    <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                      Beobachter
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onToggleObserver}
                className={`px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                  currentPlayer?.isObserver
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {currentPlayer?.isObserver ? 'Aktiv teilnehmen' : 'Beobachter-Modus'}
              </button>
              <div className="flex flex-col gap-2">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Raum-Code</p>
                  <p className="text-2xl font-bold text-primary-600 font-mono">{roomCode}</p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition duration-200"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-green-600">Kopiert!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">Link kopieren</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area - Card Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Deck */}
            {!revealed && !currentPlayer?.isObserver && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Wähle deine Karte
                </h2>
                <CardDeck
                  selectedCard={currentPlayer?.selectedCard || null}
                  onSelectCard={onSelectCard}
                  disabled={revealed}
                />
              </div>
            )}

            {/* Observer Message */}
            {!revealed && currentPlayer?.isObserver && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-center py-8">
                  <svg className="mx-auto h-16 w-16 text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Beobachter-Modus aktiv</h3>
                  <p className="text-gray-600">Du beobachtest die Abstimmung, ohne selbst teilzunehmen.</p>
                </div>
              </div>
            )}

            {/* Results */}
            {revealed && (
              <Results players={players} />
            )}

            {/* Moderator Controls */}
            {currentPlayer?.isModerator && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Moderator Steuerung
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  {!revealed && (
                    <button
                      onClick={onRevealCards}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                    >
                      Karten aufdecken
                    </button>
                  )}
                  {revealed && (
                    <button
                      onClick={onNewRound}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                    >
                      Neue Runde starten
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Player List */}
          <div className="lg:col-span-1">
            <PlayerList
              players={players}
              currentPlayerId={currentPlayer?.id || ''}
              revealed={revealed}
            />
          </div>
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {showAvatarEditor && selectedImageUrl && (
        <AvatarEditor
          imageUrl={selectedImageUrl}
          onSave={handleAvatarSave}
          onCancel={handleAvatarCancel}
        />
      )}
    </div>
  );
};

export default GameRoom;
