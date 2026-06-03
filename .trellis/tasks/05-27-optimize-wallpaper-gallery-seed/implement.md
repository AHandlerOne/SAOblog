# Implementation Plan

1. Inspect current `Wallpaper` schema, seed flow, and gallery frontend contract.
2. Collect 30-50 traceable SAO wallpaper image URLs.
3. Replace `wallpapers` array in `packages/server/prisma/seed.ts`.
4. Ensure seed clears old wallpaper rows before inserting the new canonical set, if current seed is append-only.
5. Run TypeScript/build verification.
6. Run `docker compose build server web` per project guard.
