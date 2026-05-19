import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { getThemeBySlug } from "@/lib/themes";

/**
 * Applies the user's equipped theme by injecting CSS variable overrides
 * onto <html data-theme="...">. Falls back to :root tokens when no theme
 * is equipped.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: equipped } = useEquippedCosmetics(user?.id);

  useEffect(() => {
    const root = document.documentElement;
    const theme = getThemeBySlug(equipped?.theme_slug);

    // Cleanup previous theme overrides (collect from all known themes so
    // switching back to default clears them).
    const knownVars = new Set<string>();
    if (equipped?.theme_tokens) Object.keys(equipped.theme_tokens).forEach((k) => knownVars.add(k));
    if (theme) Object.keys(theme.tokens).forEach((k) => knownVars.add(k));

    knownVars.forEach((v) => root.style.removeProperty(v));

    // Apply: prefer DB-provided theme_tokens (admin can override), else registry.
    const tokens = equipped?.theme_tokens ?? theme?.tokens ?? {};
    Object.entries(tokens).forEach(([k, v]) => {
      root.style.setProperty(k, v as string);
    });

    root.setAttribute("data-theme", equipped?.theme_slug ?? "glimer-default");
  }, [equipped?.theme_slug, equipped?.theme_tokens]);

  return <>{children}</>;
}