# Architecture Decisions

- Character sheets are stored per table and player, while attachments use a private `character-sheets` bucket with signed URLs, so access follows table participation without exposing permanent file links.- Image enlargement is a single global click listener (`ImageLightbox` mounted in App) instead of per-component modals, so every new image gets it automatically; opt out with `data-no-lightbox`.
