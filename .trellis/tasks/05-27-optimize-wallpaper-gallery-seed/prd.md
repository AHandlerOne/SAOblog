# Optimize Wallpaper Gallery Seed

## Goal

Replace the current small wallpaper seed set with a richer 30-50 item SAO wallpaper gallery dataset so visitors see more attractive gallery content after deployment.

## Requirements

- Remove the current wallpaper seed entries from `packages/server/prisma/seed.ts`.
- Add 30-50 wallpaper seed entries.
- Each entry must include `title`, `imageUrl`, `resolution`, `sourceUrl`, and `tags`.
- Use existing `characterId` and `arcId` references where the wallpaper clearly maps to a character or story arc; use `null` when uncertain.
- Prefer traceable online image URLs and record the page/source URL in `sourceUrl`.
- Keep the existing `Wallpaper` database schema unchanged.
- Preserve the existing gallery API and frontend contract.

## Acceptance Criteria

- [ ] `wallpapers.length` is between 30 and 50.
- [ ] Existing 13 local wallpaper seed entries are replaced.
- [ ] Seed data compiles with the current Prisma `Wallpaper` model.
- [ ] Gallery page can continue to render `imageUrl`, `title`, `resolution`, `sourceUrl`, character, arc, and tags without frontend contract changes.
- [ ] Docker deployability check passes with `docker compose build server web`.

## Definition of Done

- Seed file updated.
- Source URLs are included for traceability.
- Type/build verification passes.
- Docker image build passes.
- Any changed task/spec files are consistent with this task.

## Out of Scope

- No Prisma schema migration.
- No new upload pipeline.
- No admin UI redesign.
- No permanent copyright guarantee for third-party images; use traceable links and source attribution.

## Technical Notes

- Current seed path: `packages/server/prisma/seed.ts`.
- Current gallery API reads from `prisma.wallpaper`.
- Frontend gallery page consumes `Wallpaper.imageUrl`, `sourceUrl`, `resolution`, `character`, and `arc`.
- Project guard requires Docker deployability and Prisma schema consistency.
