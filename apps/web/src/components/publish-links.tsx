import { ExternalLink } from 'lucide-react';
import { getPublishLinks, type PublishResult } from '@/lib/publish-links';

export function PublishLinks({
  results,
  className = '',
}: {
  results?: Record<string, PublishResult>;
  className?: string;
}) {
  const links = getPublishLinks(results);
  if (!links.length) return null;

  return (
    <ul className={`space-y-1 ${className}`}>
      {links.map(({ platform, url }) => (
        <li key={platform}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 hover:underline capitalize"
          >
            {platform}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}
