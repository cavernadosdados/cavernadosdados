/**
 * Theme registry. Each theme is a set of HSL token overrides applied to
 * the document root via `data-theme="<slug>"` (see ThemeProvider).
 *
 * Free themes are granted on signup; premium themes are linked to epic/legendary
 * Glimers or sold on the token shop.
 */

export interface ThemeDefinition {
  slug: string;
  name: string;
  description: string;
  /** CSS variable overrides (HSL "h s% l%" strings, no `hsl()` wrapper). */
  tokens: Record<string, string>;
  preview: { background: string; primary: string; secondary: string };
}

export const THEMES: ThemeDefinition[] = [
  {
    slug: "glimer-default",
    name: "Eclipse Esmeralda",
    description: "O tema padrão do Glimer: verde profundo + dourado quente.",
    tokens: {}, // empty = use :root
    preview: { background: "#0A0F0D", primary: "#10B981", secondary: "#FBBF24" },
  },
  {
    slug: "glimer-aurora",
    name: "Aurora Mística",
    description: "Violeta cósmico com ciano luminoso.",
    tokens: {
      "--background": "240 35% 6%",
      "--card": "245 30% 10%",
      "--popover": "245 30% 9%",
      "--primary": "255 80% 68%",
      "--primary-foreground": "240 30% 6%",
      "--secondary": "184 78% 64%",
      "--secondary-foreground": "240 30% 6%",
      "--accent": "255 80% 68%",
      "--ring": "255 80% 68%",
      "--sidebar-background": "240 35% 5%",
      "--sidebar-accent": "245 30% 11%",
      "--sidebar-primary": "255 80% 68%",
    },
    preview: { background: "#0B0B14", primary: "#7C5CFF", secondary: "#5CE1E6" },
  },
  {
    slug: "glimer-ember",
    name: "Brasa Estelar",
    description: "Coral vibrante + amarelo solar para mestres incendiários.",
    tokens: {
      "--background": "260 18% 6%",
      "--card": "270 18% 11%",
      "--popover": "270 18% 10%",
      "--primary": "353 100% 68%",
      "--primary-foreground": "260 30% 6%",
      "--secondary": "44 100% 70%",
      "--secondary-foreground": "260 30% 6%",
      "--accent": "353 100% 68%",
      "--ring": "353 100% 68%",
      "--sidebar-background": "260 18% 5%",
      "--sidebar-accent": "270 18% 12%",
      "--sidebar-primary": "353 100% 68%",
    },
    preview: { background: "#0C0C12", primary: "#FF5B6E", secondary: "#FFD66B" },
  },
  {
    slug: "glimer-cobalt",
    name: "Profundo Cobalto",
    description: "Azul abissal limpo, técnico, confiável.",
    tokens: {
      "--background": "220 50% 8%",
      "--card": "215 45% 16%",
      "--popover": "215 45% 15%",
      "--primary": "217 91% 60%",
      "--primary-foreground": "220 50% 8%",
      "--secondary": "199 89% 90%",
      "--secondary-foreground": "220 50% 8%",
      "--accent": "217 91% 60%",
      "--ring": "217 91% 60%",
      "--sidebar-background": "220 50% 7%",
      "--sidebar-accent": "215 45% 17%",
      "--sidebar-primary": "217 91% 60%",
    },
    preview: { background: "#08101F", primary: "#3B82F6", secondary: "#E0F2FE" },
  },
];

export function getThemeBySlug(slug: string | null | undefined): ThemeDefinition | undefined {
  if (!slug) return undefined;
  return THEMES.find((t) => t.slug === slug);
}