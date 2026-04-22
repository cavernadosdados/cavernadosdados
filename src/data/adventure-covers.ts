/**
 * Galeria de capas pré-aprovadas para mesas.
 *
 * Imagens vivem em /public/assets/adventure-covers/ e são referenciadas
 * por caminho absoluto (servido pelo Vite estaticamente).
 *
 * Tamanho ideal: 800x450px (aspect ratio 16:9) para manter performance e
 * enquadramento consistentes em cards e banners.
 */
export interface AdventureCover {
  id: string;
  label: string;
  url: string;
}

export const ADVENTURE_COVERS: AdventureCover[] = [
  { id: 'dark-fantasy',     label: 'Castelo Sombrio',    url: '/assets/adventure-covers/dark-fantasy.jpg' },
  { id: 'arcane-tower',     label: 'Torre Arcana',       url: '/assets/adventure-covers/arcane-tower.jpg' },
  { id: 'dungeon',          label: 'Masmorra',           url: '/assets/adventure-covers/dungeon.jpg' },
  { id: 'cosmic-horror',    label: 'Horror Cósmico',     url: '/assets/adventure-covers/cosmic-horror.jpg' },
  { id: 'cyberpunk',        label: 'Cyberpunk',          url: '/assets/adventure-covers/cyberpunk.jpg' },
  { id: 'enchanted-forest', label: 'Floresta Encantada', url: '/assets/adventure-covers/enchanted-forest.jpg' },
];