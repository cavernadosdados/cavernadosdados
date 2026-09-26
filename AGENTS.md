# Architecture Decisions

- Character sheets are stored per table and player, while attachments use a private `character-sheets` bucket with signed URLs, so access follows table participation without exposing permanent file links.