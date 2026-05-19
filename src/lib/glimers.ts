// Static asset map for cosmetic items.
// The DB stores a slug; we resolve to the bundled image URL here so Vite
// hashes the asset and we keep the catalog deploy-friendly.

import wanderer from "@/assets/glimers/wanderer.png";
import apprentice from "@/assets/glimers/apprentice.png";
import ranger from "@/assets/glimers/ranger.png";
import bard from "@/assets/glimers/bard.png";
import knight from "@/assets/glimers/knight.png";
import druid from "@/assets/glimers/druid.png";
import rogue from "@/assets/glimers/rogue.png";
import cleric from "@/assets/glimers/cleric.png";
import archmage from "@/assets/glimers/archmage.png";
import dragonborn from "@/assets/glimers/dragonborn.png";
import shadowblade from "@/assets/glimers/shadowblade.png";
import celestial from "@/assets/glimers/celestial.png";

export const GLIMER_ASSETS: Record<string, string> = {
  wanderer,
  apprentice,
  ranger,
  bard,
  knight,
  druid,
  rogue,
  cleric,
  archmage,
  dragonborn,
  shadowblade,
  celestial,
};

export function resolveCosmeticImage(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  return GLIMER_ASSETS[slug];
}

export const RARITY_STYLES: Record<string, { label: string; ring: string; badge: string }> = {
  common: {
    label: "Comum",
    ring: "ring-muted-foreground/40",
    badge: "bg-muted text-muted-foreground",
  },
  rare: {
    label: "Raro",
    ring: "ring-primary/70",
    badge: "bg-primary/20 text-primary border border-primary/40",
  },
  epic: {
    label: "Épico",
    ring: "ring-secondary/80",
    badge: "bg-secondary/20 text-secondary border border-secondary/50",
  },
  legendary: {
    label: "Lendário",
    ring: "ring-secondary",
    badge: "bg-gradient-to-r from-primary/30 to-secondary/30 text-secondary border border-secondary",
  },
};