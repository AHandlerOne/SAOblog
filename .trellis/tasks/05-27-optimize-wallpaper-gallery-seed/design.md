# Design

## Data Flow

Online image/source selection -> wallpaper seed array -> Prisma `wallpaper.create` -> `/api/wallpapers` -> gallery masonry cards and preview modal.

## Contracts

- Database model remains `Wallpaper`.
- `imageUrl` remains a string that can be either local `/images/...` or remote `https://...`.
- `sourceUrl` records the attribution/source page or image URL.
- `tags` remains `String[]`.

## Approach

Use remote image URLs for this iteration to avoid committing 30-50 large binary files. Keep the current frontend and API unchanged. Replace only the `wallpapers` seed array and, if needed, adjust seeding behavior to clear existing wallpaper rows before inserting the new canonical gallery set.

## Tradeoffs

- Remote URLs reduce repository size but can break if the host changes files or blocks hotlinking.
- Downloading images locally would be more stable but increases repository size and requires stronger source/license review.
- This task will prioritize visual breadth and traceable sources while keeping implementation small.

## Validation

- Type-check/build via `pnpm --filter @sao/server build` or Docker server build.
- Full guard via `docker compose build server web`.
