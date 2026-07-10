import { DEFAULT_AVATARS } from '../types';

interface AvatarPickerModalProps {
  currentAvatarUrl: string | null;
  onSelectDefault: (path: string) => void;
  onUploadClick: () => void;
  onRemove: () => void;
  onClose: () => void;
}

// '/avatars/bison-kopf.svg' -> 'bison kopf'
const avatarName = (path: string) =>
  path.split('/').pop()!.replace('.svg', '').replace(/-/g, ' ');

const AvatarPickerModal = ({
  currentAvatarUrl,
  onSelectDefault,
  onUploadClick,
  onRemove,
  onClose,
}: AvatarPickerModalProps) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="avatar-picker-title" className="text-2xl font-bold text-gray-800">Choose an avatar</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {DEFAULT_AVATARS.map((path) => (
            <button
              key={path}
              onClick={() => onSelectDefault(path)}
              className={`rounded-full overflow-hidden border-2 aspect-square bg-gray-100 hover:border-primary-500 transition-colors ${
                currentAvatarUrl === path ? 'border-primary-600' : 'border-transparent'
              }`}
              aria-label={`Select avatar ${avatarName(path)}`}
              aria-pressed={currentAvatarUrl === path}
            >
              <img src={path} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onUploadClick}
            className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition duration-200"
          >
            Upload your own
          </button>
          {currentAvatarUrl && (
            <button
              onClick={onRemove}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition duration-200"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
