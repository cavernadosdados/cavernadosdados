import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";
import { getThemeBySlug } from "@/lib/themes";

const STORAGE_KEY = "glimer:theme";

/**
 * Applies the user's equipped theme by injecting CSS variable overrides
 * onto <html data-theme="...">. Falls back to :root tokens when no theme
 * is equipped. Persists the resolved theme to localStorage so the next
 * navigation/refresh can apply it synchronously (see index.html bootstrap)
 * and avoid a flash to the default palette.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: equipped, isLoading, isFetching } = useEquippedCosmetics(user?.id);

  useEffect(() => {
    // Wait for the query to resolve at least once before touching the DOM.
    // Otherwise we'd briefly strip the synchronously-applied theme (from
    // the inline bootstrap in index.html) back to :root defaults.
    if (user && (isLoading || (isFetching && equipped === undefined))) return;

    const root = document.documentElement;
    const theme = getThemeBySlug(equipped?.theme_slug);

    // Cleanup previous theme overrides. Read the previously-persisted set
    // so we also clear vars from a theme that's no longer in the registry.
    const knownVars = new Set<string>();
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (prev?.tokens) Object.keys(prev.tokens).forEach((k) => knownVars.add(k));
    } catch {}
    if (equipped?.theme_tokens) Object.keys(equipped.theme_tokens).forEach((k) => knownVars.add(k));
    if (theme) Object.keys(theme.tokens).forEach((k) => knownVars.add(k));

    // Apply: prefer DB-provided theme_tokens (admin can override), else registry.
    const tokens = (equipped?.theme_tokens ?? theme?.tokens ?? {}) as Record<string, string>;

    // Remove only vars that won't be re-set (avoids a flicker between remove+set).
    knownVars.forEach((v) => {
      if (!(v in tokens)) root.style.removeProperty(v);
    });

    Object.entries(tokens).forEach(([k, v]) => {
      root.style.setProperty(k, v as string);
    });

    const slug = equipped?.theme_slug ?? "glimer-default";
    root.setAttribute("data-theme", slug);

    // Persist for synchronous bootstrap on the next page load.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug, tokens }));
    } catch {}
  }, [user, isLoading, isFetching, equipped?.theme_slug, equipped?.theme_tokens]);

  return <>{children}</>;
}