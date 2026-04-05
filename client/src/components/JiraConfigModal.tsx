import { useState } from 'react';

interface JiraConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: { baseUrl: string; email: string; apiToken: string; storyPointsFieldId?: string }) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  detectedBaseUrl?: string;
}

const JiraConfigModal = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  isConnected,
  detectedBaseUrl
}: JiraConfigModalProps) => {
  const [baseUrl, setBaseUrl] = useState(detectedBaseUrl || '');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [storyPointsFieldId, setStoryPointsFieldId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Normalize base URL (remove trailing slash)
    const normalizedUrl = baseUrl.replace(/\/$/, '');

    onConnect({
      baseUrl: normalizedUrl,
      email,
      apiToken,
      storyPointsFieldId: storyPointsFieldId || undefined
    });

    // Loading state will be cleared by parent when jiraConfigured or jiraError is received
    setTimeout(() => setIsLoading(false), 5000); // Timeout fallback
  };

  const handleDisconnect = () => {
    onDisconnect();
    setBaseUrl('');
    setEmail('');
    setApiToken('');
    setStoryPointsFieldId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {isConnected ? 'Jira connection' : 'Connect to Jira'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800">Connected to Jira</p>
                    <p className="text-sm text-green-600">You can now import Jira issues</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jira URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-team.atlassian.net"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  The URL of your Jira instance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  The email of your Atlassian account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Your API token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Create a token at{' '}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    Atlassian API Tokens
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story Points field ID (optional)
                </label>
                <input
                  type="text"
                  value={storyPointsFieldId}
                  onChange={(e) => setStoryPointsFieldId(e.target.value)}
                  placeholder="e.g. customfield_10016"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The ID of the Story Points field in your Jira. Without this, story points cannot be synced.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default JiraConfigModal;
