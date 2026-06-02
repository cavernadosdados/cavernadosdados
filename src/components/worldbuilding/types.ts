import type { Database } from "@/integrations/supabase/types";

/**
 * Typed rows for Worldbuilding lore tables.
 * Prefer these over `Record<string, any>` to catch column-name bugs at compile time.
 */
export type LoreNpc = Database["public"]["Tables"]["lore_npcs"]["Row"];
export type LoreFaction = Database["public"]["Tables"]["lore_factions"]["Row"];
export type LoreLocation = Database["public"]["Tables"]["lore_locations"]["Row"];
export type LoreDeity = Database["public"]["Tables"]["lore_deities"]["Row"];
export type LoreItem = Database["public"]["Tables"]["lore_items"]["Row"];
export type LoreTimelineEvent = Database["public"]["Tables"]["lore_timeline"]["Row"];
export type LoreCodexEntry = Database["public"]["Tables"]["lore_codex"]["Row"];

export type AnyLoreRow =
  | LoreNpc
  | LoreFaction
  | LoreLocation
  | LoreDeity
  | LoreItem
  | LoreTimelineEvent
  | LoreCodexEntry;