import { useState } from 'react';

interface JqlImportSectionProps {
  onFetchStories: (jql: string) => void;
  onRefresh: () => void;
  jiraConnected: boolean;
}

const JqlImportSection = ({
  onFetchStories,
  onRefresh,
  jiraConnected
}: JqlImportSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [jqlQuery, setJqlQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!jqlQuery.trim() || !jiraConnected) return;

    setIsLoading(true);
    onFetchStories(jqlQuery.trim());
    // Reset loading after a timeout (parent will update stories)
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    onRefresh();
    setTimeout(() => setIsLoading(false), 3000);
  };

  // Common JQL examples
  const jqlExamples = [
    { label: 'Sprint aktiv', jql: 'sprint in openSprints()' },
    { label: 'Meine Stories', jql: 'assignee = currentUser() AND type = Story' },
    { label: 'Ohne Schätzung', jql: '"Story Points" is EMPTY AND type = Story' }
  ];

  if (!jiraConnected) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          Erweitert: JQL-Import
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* JQL Input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              JQL-Abfrage
            </label>
            <textarea
              value={jqlQuery}
              onChange={(e) => setJqlQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='z.B. project = "PROJ" AND sprint in openSprints()'
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={2}
            />
            <p className="mt-1 text-xs text-gray-500">
              Strg+Enter zum Importieren
            </p>
          </div>

          {/* Quick JQL Examples */}
          <div className="flex flex-wrap gap-2">
            {jqlExamples.map((example) => (
              <button
                key={example.label}
                onClick={() => setJqlQuery(example.jql)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {example.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!jqlQuery.trim() || isLoading}
              className="flex-1 py-2 px-4 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importiere...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Importieren
                </>
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="py-2 px-4 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
              title="Jira-Stories aktualisieren"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JqlImportSection;
