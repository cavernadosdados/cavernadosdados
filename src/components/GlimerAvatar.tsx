import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { resolveCosmeticImage } from "@/lib/glimers";

interface GlimerAvatarProps {
  userId?: string | null;
  /** Initials shown when no image is available */
  fallbackText?: string;
  /** Accessible name for clickable avatars. */
  label?: string;
  /** Tailwind size class on the outer wrapper. Default: h-10 w-10 */
  className?: string;
  /** If true, hides the equipped frame overlay (useful in dense lists). */
  hideFrame?: boolean;
  /** Click handler — adds cursor-pointer automatically when provided */
  onClick?: () => void;
}

/**
 * Avatar that displays the user's equipped Glimer (or fallback) with their
 * equipped frame overlay rendered on top. Centralised so every avatar in the
 * app stays consistent.
 */
export function GlimerAvatar({
  userId,
  fallbackText,
  label,
  className,
  hideFrame = false,
  onClick,
}: GlimerAvatarProps) {
  const { data: equipped } = useEquippedCosmetics(userId);

  const glimerSrc =
    resolveCosmeticImage(equipped?.glimer_slug) ?? equipped?.glimer_image_url ?? undefined;
  const frameSrc = !hideFrame
    ? resolveCosmeticImage(equipped?.frame_slug) ?? equipped?.frame_image_url ?? undefined
    : undefined;

  return (
    <div
      className={cn("relative inline-block h-10 w-10", onClick && "cursor-pointer", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? label ?? "Abrir imagem de perfil" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <Avatar className="absolute inset-[5%] h-[90%] w-[90%]">
        {glimerSrc && <AvatarImage src={glimerSrc} alt={label ?? ""} />}
        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
          {fallbackText?.slice(0, 2).toUpperCase() ?? "?"}
        </AvatarFallback>
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