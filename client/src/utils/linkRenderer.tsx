/**
 * Utility to render text with clickable http/https links.
 */
export const renderSummaryWithLinks = (summary: string) => {
    // Regex to find http/https links - using a non-greedy match followed by optional punctuation
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = summary.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
            // Clean up trailing punctuation that isn't part of the URL
            const cleanUrl = part.replace(/[.,!?;:)]+$/, "");
            const trailingPunctuation = part.substring(cleanUrl.length);

            return (
                <span key={index}>
                    <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {cleanUrl}
                    </a>
                    {trailingPunctuation}
                </span>
            );
        }
        return part;
    });
};
