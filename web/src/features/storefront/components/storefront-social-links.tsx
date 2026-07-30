import { Camera, Link as LinkIcon, MessageCircle, Music2, PlaySquare, type LucideIcon } from 'lucide-react';
import type { StorefrontSocialLink } from '../types/storefront.types';

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  instagram: Camera,
  tiktok: Music2,
  whatsapp: MessageCircle,
  youtube: PlaySquare,
  other: LinkIcon,
};

export const StorefrontSocialLinks = ({ links }: { links: StorefrontSocialLink[] }) => {
  if (links.length === 0) return null;

  const sorted = [...links].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-4">
      {sorted.map((link) => {
        const Icon = PLATFORM_ICONS[link.platform] ?? LinkIcon;
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={link.platform}
            className="flex size-10 items-center justify-center rounded-full border bg-background hover:bg-muted"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
};
