# Rhapsody of Realities — Daily Fetch & Sidebar UI

This document explains how the Rhapsody daily devotional is fetched, parsed, cached, and displayed in the dashboard sidebar. It is written so you can lift the approach and reuse it in another Next.js project with minimal changes.

## Overview

- The browser loads a React component that calls a local API route (`/api/rhapsody`).
- The API route first calls Rhapsody’s public JSON endpoint for the given date/language. If unavailable, it falls back to parsing the HTML.
- The API normalizes the content into a stable JSON shape: title, theme scripture, devotional paragraphs, prayer/confession, and further study.
- We cache results aggressively server-side and lightly client-side to avoid over‑fetching.
- The sidebar renders the sections in a scrollable card that matches the live video player’s height.

## Files

- API route: `src/app/api/rhapsody/route.ts`
- Sidebar component: `src/components/RhapsodyDaily.tsx`
- Dashboard integration (equal-height with player): `src/app/dashboard/page.tsx`
- Player resize event (to keep heights in sync): `src/components/HLSPlayer.tsx`

## Dependencies

- `cheerio` (server‑side DOM utilities)

Install in a new project:

```
npm install cheerio
```

## Environment

- `RHAPSODY_BASE_URL` (optional): Defaults to `https://read.rhapsodyofrealities.org`.
- `RHAPSODY_LANG` (optional): Defaults to `english`.

Example in `.env`:

```
RHAPSODY_BASE_URL=https://read.rhapsodyofrealities.org
RHAPSODY_LANG=english
```

## API Route

Path: `src/app/api/rhapsody/route.ts:1`

Key behavior:

- Primary source (JSON): `GET {BASE}/api/ror-translations/{YYYY-MM-DD}/{lang}`
- Fallback source (HTML): `GET {BASE}` with Cheerio extraction across headings and content areas.
- Normalization: Converts the sources into a single JSON payload (see “Response Shape”).
- Caching:
  - In-memory (per server instance): 1 hour in production; disabled in dev.
  - Next.js revalidate: 1 hour for upstream fetches.
  - Response headers: `Cache-Control: public, max-age=1800` (30 minutes) in production; `no-store` in dev or when forced.

Query parameters:

- `date`: ISO date `YYYY-MM-DD` (defaults to today).
- `lang`: Language key (defaults to `english`).
- `refresh=1`: Bypass in-memory and browser cache (useful for dev or admin refresh).

Response shape:

```
{
  "title": "SUPERNATURAL KNOWLEDGE",
  "description": null,
  "scripture": "In whom are hid all the treasures of wisdom and knowledge (Colossians 2:3).",
  "sections": {
    "devotional": ["paragraph 1", "paragraph 2", ...],
    "prayer": ["prayer/confession text"],
    "furtherStudy": ["Matthew 13:11", "Proverbs 2:6", ...]
  },
  "sourceUrl": "https://read.rhapsodyofrealities.org",
  "fetchedAt": "2025-09-11T11:03:54.123Z"
}
```

Examples:

```
# Today (prod caching)
curl /api/rhapsody

# Today in Spanish (if available)
curl "/api/rhapsody?lang=spanish"

# Specific date
curl "/api/rhapsody?date=2025-09-11"

# Force refresh (dev/admin)
curl "/api/rhapsody?refresh=1"
```

Notes:

- The route strips scripts/styles, normalizes quotes, and removes duplicate first paragraph if it matches the theme scripture.
- If the JSON endpoint changes, the HTML fallback still returns readable text.

## Sidebar Component

Path: `src/components/RhapsodyDaily.tsx:1`

Behavior:

- Fetches `/api/rhapsody` on mount. In dev, it appends `?refresh=1` and disables browser cache.
- Renders:
  - Centered title
  - Date in “day month year” format
  - Theme Scripture block
  - Devotional paragraphs
  - Prayer / Confession
  - Further Study (as a list)
- Error and loading states are handled gracefully.

To reuse:

- Copy the component into your project and adjust styling if you’re not using Tailwind.
- Replace the fetch path if your API is mounted elsewhere.

## Equal-Height Layout With Player

Paths:

- Grid and measurement: `src/app/dashboard/page.tsx:1`
- Player events: `src/components/HLSPlayer.tsx:1`

Technique:

- A `ResizeObserver` measures the left card (video) and sets the same height on the right card (Rhapsody).
- The Rhapsody card uses `overflow-y-auto` so content scrolls inside the card, keeping heights aligned.
- The player emits a custom `zchurch-player-resize` event on video load states to trigger a remeasure when the aspect ratio settles.

Tailwind classes used:

- Grid: `grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch`
- Cards: `flex flex-col min-h-0 overflow-hidden`
- Scroll body: `flex-1 min-h-0 overflow-y-auto`

If you’re not using Tailwind, replicate with equivalent CSS:

```
.col { display: flex; flex-direction: column; min-height: 0; }
.scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
```

## Reuse In Another Next.js Project

1) Install dependency

```
npm install cheerio
```

2) Create API route

- Copy `src/app/api/rhapsody/route.ts` into the same path in your project (Next.js App Router).
- Or place it under any path you prefer and update the frontend fetch URL.

3) Add the sidebar component

- Copy `src/components/RhapsodyDaily.tsx` and include it where you want the sidebar.
- Wrap in a scrollable container with a fixed height if you need alignment with another element.

4) Optional: Equal-height with a video

- Use a `ResizeObserver` to measure the video container and apply the height to the sidebar.
- Emit a custom event from the player on `loadedmetadata`/`canplay` to force remeasure.

5) Configure environment

- Add `RHAPSODY_BASE_URL` and `RHAPSODY_LANG` to `.env` if needed.

## Tuning & Customization

- Caching cadence: In `route.ts`, adjust `CACHE_MS` (in‑memory) and `next: { revalidate }` (Next.js fetch cache). Current default is 1 hour (prod), dev is uncached.
- Browser cache hint: response header `Cache-Control: public, max-age=1800` (30 min). Adjust as you like.
- Language/date: Pass `?lang=` and `?date=YYYY-MM-DD` to the API, or set env defaults.
- Styling: Tailwind classes can be swapped for your design system.
- Accessibility: Headings and list semantics are preserved; tweak as required.

## Failure Modes & Fallbacks

- JSON endpoint unavailable: HTML fallback attempts to extract content by headings.
- Upstream structure changes: You still get readable text, but you may lose rich structure. Update selectors if needed.
- Serverless instances: In-memory cache is per instance; consider a shared cache (KV/Redis) if you need global dedupe.

## Upstream API Change History

The upstream Rhapsody website has changed their API endpoints without notice. Track changes here for future reference:

| Date       | Change Description                                                                 |
|------------|------------------------------------------------------------------------------------|
| 2025-12-29 | API endpoint changed from `/api/devotional-translations/{date}/{lang}` to `/api/ror-translations/{date}/{lang}`. The old endpoint now returns HTML instead of JSON. |

### Future-Proofing Recommendations

1. **Monitor for failures**: Set up alerts for 5xx responses or empty content from `/api/rhapsody`. Upstream changes may break parsing without warning.

2. **Periodic validation**: Manually verify the devotional loads correctly after upstream site updates (check `https://read.rhapsodyofrealities.org` for redesigns).

3. **API endpoint discovery**: If the JSON API breaks again, inspect the upstream site's JavaScript bundles:
   ```bash
   curl -sL "https://read.rhapsodyofrealities.org" | grep -o 'script.*src="[^"]*index.js[^"]*"'
   curl -sL "https://read.rhapsodyofrealities.org/views/dist/index.js" | grep -o 'DEVOTIONAL:[^,]*'
   ```

4. **Known upstream endpoints** (as of December 2025):
   - JSON API: `https://read.rhapsodyofrealities.org/api/ror-translations/{YYYY-MM-DD}/{language}`
   - Daily devotional (internal): `https://read.rhapsodyofrealities.org/api/daily-devotional/{YYYY-MM-DD}` (requires auth cookie)
   - Languages list: `https://read.rhapsodyofrealities.org/api/list-ror-translations`

5. **Fallback robustness**: The HTML scraping fallback remains functional but depends on heading patterns. If upstream changes their HTML structure significantly, update the `extractByHeadings()` function in `route.ts`.

## Testing & Debugging

- Inspect raw JSON: open `/api/rhapsody?refresh=1`.
- Simulate another day: `/api/rhapsody?date=2025-09-11`.
- Check console logs in dev for parsing and sizing diagnostics.

## License & Usage

- Ensure your use complies with Rhapsody of Realities’ terms of service and content policies. This integration reads public content for display within your application and links back to the source.

