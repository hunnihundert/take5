import { useState } from 'react';
import { Story } from '../types';

interface StoryListProps {
  stories: Story[];
  activeStory: Story | null;
  isModerator: boolean;
  jiraConnected: boolean;
  onSelectStory: (storyId: string | null) => void;
  onRemoveStory: (storyId: string) => void;
  onAddManualStory: (summary: string) => void;
  onClearStories: () => void;
  onAddStoryByLink: (url: string) => void;
  onOpenJiraConfig: () => void;
}

const StoryList = ({
  stories,
  activeStory,
  isModerator,
  jiraConnected,
  onSelectStory,
  onRemoveStory,
  onAddManualStory,
  onClearStories,
  onAddStoryByLink,
  onOpenJiraConfig
}: StoryListProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStorySummary, setNewStorySummary] = useState('');
  const [jiraLinkInput, setJiraLinkInput] = useState('');

  const handleAddStory = () => {
    if (newStorySummary.trim()) {
      onAddManualStory(newStorySummary.trim());
      setNewStorySummary('');
      setShowAddModal(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddStory();
    }
    if (e.key === 'Escape') {
      setShowAddModal(false);
      setNewStorySummary('');
    }
  };

  const handleJiraLinkSubmit = () => {
    if (jiraLinkInput.trim()) {
      onAddStoryByLink(jiraLinkInput.trim());
      setJiraLinkInput('');
    }
  };

  const handleJiraLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJiraLinkSubmit();
    }
  };

  const votedCount = stories.filter(s => s.voted).length;
  const totalCount = stories.length;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Stories
          {totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({votedCount}/{totalCount} geschätzt)
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {isModerator && (
            <button
              onClick={onOpenJiraConfig}
              className={`p-2 rounded-lg transition-colors ${
                jiraConnected
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
              }`}
              title={jiraConnected ? 'Jira verbunden' : 'Mit Jira verbinden'}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 11.513H0l5.786-5.786 5.785 5.786zM12.429 12.487H24l-5.786 5.786-5.785-5.786z"/>
                <path d="M11.571 12.487L5.786 18.272 0 12.487l5.786-5.786 5.785 5.786z"/>
                <path d="M12.429 11.513l5.785-5.786L24 11.513l-5.786 5.786-5.785-5.786z"/>
              </svg>
            </button>
          )}
          {isModerator && stories.length > 0 && (
            <button
              onClick={onClearStories}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Alle löschen
            </button>
          )}
        </div>
      </div>

      {/* Jira Link Input (Moderator only) */}
      {isModerator && (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={jiraLinkInput}
              onChange={(e) => setJiraLinkInput(e.target.value)}
              onKeyDown={handleJiraLinkKeyDown}
              placeholder="Jira-Link einfügen..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleJiraLinkSubmit}
              disabled={!jiraLinkInput.trim()}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
              title="Story importieren"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Story List */}
      {stories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Keine Stories vorhanden</p>
          {isModerator && (
            <p className="text-sm mt-1">Füge Stories hinzu, um mit dem Schätzen zu beginnen</p>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {stories.map((story) => (
            <div
              key={story.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                activeStory?.id === story.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {story.voted && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {story.storyPoints} SP
                        </span>
                      )}
                      {story.isManual && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Manuell
                        </span>
                      )}
                    </div>
                    {story.key && (
                      story.url ? (
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono bg-blue-50 text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title="In Jira öffnen"
                        >
                          {story.key}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {story.key}
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-1 truncate" title={story.summary}>
                    {story.summary}
                  </p>
                </div>

                {isModerator && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {activeStory?.id === story.id ? (
                      <button
                        onClick={() => onSelectStory(null)}
                        className="p-1.5 text-primary-600 hover:bg-primary-100 rounded"
                        title="Abwählen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectStory(story.id)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Zur Abstimmung auswählen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveStory(story.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Story Button (Moderator only) */}
      {isModerator && (
        <div className="mt-4">
          {showAddModal ? (
            <div className="space-y-3">
              <textarea
                value={newStorySummary}
                onChange={(e) => setNewStorySummary(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Story-Beschreibung eingeben..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddStory}
                  disabled={!newStorySummary.trim()}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  Hinzufügen
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewStorySummary('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-primary-400 hover:text-primary-600 transition duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Story hinzufügen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryList;
