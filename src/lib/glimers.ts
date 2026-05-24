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

import frameBronze from "@/assets/frames/bronze.png";
import frameSilver from "@/assets/frames/silver.png";
import frameVines from "@/assets/frames/vines.png";
import frameRunes from "@/assets/frames/runes.png";
import frameGold from "@/assets/frames/gold.png";
import frameEmerald from "@/assets/frames/emerald.png";
import frameRuby from "@/assets/frames/ruby.png";
import frameObsidian from "@/assets/frames/obsidian.png";
import frameCrystal from "@/assets/frames/crystal.png";
import frameDragon from "@/assets/frames/dragon.png";
import frameVoid from "@/assets/frames/void.png";
import frameCelestial from "@/assets/frames/celestial.png";

import coverTavern from "@/assets/covers/tavern.jpg";
import coverForest from "@/assets/covers/forest.jpg";
import coverMountains from "@/assets/covers/mountains.jpg";
import coverLibrary from "@/assets/covers/library.jpg";
import coverDungeon from "@/assets/covers/dungeon.jpg";
import coverCastle from "@/assets/covers/castle.jpg";
import coverSwamp from "@/assets/covers/swamp.jpg";
import coverOcean from "@/assets/covers/ocean.jpg";
import coverDesert from "@/assets/covers/desert.jpg";
import coverSnowfield from "@/assets/covers/snowfield.jpg";
import coverBattlefield from "@/assets/covers/battlefield.jpg";
import coverStars from "@/assets/covers/stars.jpg";

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
  // Frames (keyed by full DB slug)
  "frame-bronze": frameBronze,
  "frame-silver": frameSilver,
  "frame-vines": frameVines,
  "frame-runes": frameRunes,
  "frame-gold": frameGold,
  "frame-emerald": frameEmerald,
  "frame-ruby": frameRuby,
  "frame-obsidian": frameObsidian,
  "frame-crystal": frameCrystal,
  "frame-dragon": frameDragon,
  "frame-void": frameVoid,
  "frame-celestial": frameCelestial,
  // Covers
  "cover-tavern": coverTavern,
  "cover-forest": coverForest,
  "cover-mountains": coverMountains,
  "cover-library": coverLibrary,
  "cover-dungeon": coverDungeon,
  "cover-castle": coverCastle,
  "cover-swamp": coverSwamp,
  "cover-ocean": coverOcean,
  "cover-desert": coverDesert,
  "cover-snowfield": coverSnowfield,
  "cover-battlefield": coverBattlefield,
  "cover-stars": coverStars,
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