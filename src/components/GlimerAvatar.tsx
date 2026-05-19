import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { resolveCosmeticImage } from "@/lib/glimers";

interface GlimerAvatarProps {
  userId?: string | null;
  /** Fallback avatar URL (e.g. user upload from profiles.avatar_url) */
  fallbackUrl?: string | null;
  /** Initials shown when no image is available */
  fallbackText?: string;
  /** Tailwind size class on the outer wrapper. Default: h-10 w-10 */
  className?: string;
  /** If true, hides the equipped frame overlay (useful in dense lists). */
  hideFrame?: boolean;
}

/**
 * Avatar that displays the user's equipped Glimer (or fallback) with their
 * equipped frame overlay rendered on top. Centralised so every avatar in the
 * app stays consistent.
 */
export function GlimerAvatar({
  userId,
  fallbackUrl,
  fallbackText,
  className,
  hideFrame = false,
}: GlimerAvatarProps) {
  const { data: equipped } = useEquippedCosmetics(userId);

  const glimerSrc =
    resolveCosmeticImage(equipped?.glimer_slug) ?? fallbackUrl ?? undefined;
  const frameSrc = !hideFrame
    ? resolveCosmeticImage(equipped?.frame_slug) ?? equipped?.frame_image_url ?? undefined
    : undefined;

  return (
    <div className={cn("relative inline-block h-10 w-10", className)}>
      <Avatar className="h-full w-full">
        {glimerSrc && <AvatarImage src={glimerSrc} alt="" />}
        <AvatarFallback>{fallbackText?.slice(0, 2).toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      {frameSrc && (
        <img
          src={frameSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  );
}