import { Story } from '../types';
import { renderSummaryWithLinks } from '../utils/linkRenderer';

interface ActiveStoryBannerProps {
  story: Story;
}

const ActiveStoryBanner = ({ story }: ActiveStoryBannerProps) => {
  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
              Aktuelle Story
            </span>
            {story.key && (
              <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">
                {story.key}
              </span>
            )}
            {story.isManual && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                Manuell
              </span>
            )}
          </div>
          <div className="font-medium" title={story.summary}>
            {renderSummaryWithLinks(story.summary)}
          </div>
        </div>
        {story.url && (
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Link öffnen"
            aria-label="Link öffnen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};

export default ActiveStoryBanner;
