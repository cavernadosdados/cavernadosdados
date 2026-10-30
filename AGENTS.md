# Architecture Decisions

- Character sheets are stored per table and player, while attachments use a private `character-sheets` bucket with signed URLs, so access follows table participation without exposing permanent file links.- Image enlargement is a single global click listener (`ImageLightbox` mounted in App) instead of per-component modals, so every new image gets it automatically; opt out with `data-no-lightbox`.
- Frame art is drawn edge-to-edge on a square canvas and the Glimer size inside each frame is measured at runtime from the frame's transparency (`src/lib/frameFit.ts`), so spiky or ornate frames — including admin uploads — never show the Glimer between their details.
