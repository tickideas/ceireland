# HLSPlayer Split Design

## Context

`src/components/HLSPlayer.tsx` is roughly 1,035 lines and mixes stream lifecycle, viewer presence, player controls, and view rendering in one module. This makes the player hard to reason about, hard to test, and risky to change.

This design implements architecture review candidate 5: split `HLSPlayer.tsx` into deeper modules with narrower interfaces while preserving behaviour.

## Goals

- Preserve existing UI and runtime behaviour.
- Improve Locality by moving HLS stream lifecycle concerns into `useHlsStream`.
- Improve Locality by moving viewer heartbeat concerns into `useViewerHeartbeat`.
- Move large JSX rendering into `HLSPlayerView` so the top-level `HLSPlayer` becomes composition glue.
- Move pure formatting helpers into `playerUtils` with unit tests.
- Avoid introducing new frameworks, dependencies, API routes, or database changes.

## Non-goals

- No visual redesign.
- No player feature changes.
- No analytics or tracking changes.
- No new browser/E2E test setup.
- No changes to `/api/stream`, `/api/viewers/heartbeat`, or `/api/attendance/checkin`.

## Chosen Approach

Use a three-module split:

```txt
src/components/HLSPlayer.tsx
src/components/player/HLSPlayerView.tsx
src/components/player/useHlsStream.ts
src/components/player/useViewerHeartbeat.ts
src/components/player/playerUtils.ts
src/components/player/playerUtils.test.ts
```

### `HLSPlayer.tsx`

Composition module only. It owns refs required by both hooks and the view, wires hook outputs into props, and renders `HLSPlayerView`.

Expected responsibilities:

- Create `videoRef`, `containerRef`, `progressRef`.
- Call `useHlsStream({ videoRef, src, poster })`.
- Call `useViewerHeartbeat({ isPlaying, isActive })`.
- Render `HLSPlayerView` with state/actions.

### `useHlsStream.ts`

Owns the stream lifecycle and video playback controller state.

Responsibilities:

- Fetch `/api/stream` on mount.
- Track stream settings: `streamUrl`, `isActive`, `posterUrl`, `nextScheduled`, `nextScheduledLabel`.
- Track playback state: `isPlaying`, `isMuted`, `volume`, `currentTime`, `duration`, `buffered`, `isFullscreen`, `showControls`.
- Own HLS.js instance creation/destruction.
- Use native HLS when supported; dynamically import `hls.js` otherwise.
- Handle fatal HLS errors:
  - `NETWORK_ERROR`: mark stream offline and start retry loop.
  - `MEDIA_ERROR`: attempt `recoverMediaError()`, then offline if recovery throws.
  - default fatal error: mark stream offline and start retry loop.
- Own stream retry loop: 30s interval while stream is offline.
- Own countdown for next scheduled service and polling `/api/stream` every 10s when countdown ends.
- Own attendance check-in on first `play` event only.
- Own custom-control actions: `togglePlay`, `toggleFullscreen`, `handleProgressClick`, `handleMouseMove`, `handleVolumeInput`, `retryStream`, `getPoster`.
- Own video event listeners and keyboard shortcuts.

Interface returns the state/action object needed by the view plus a small number of refs passed in by the composition component.

### `useViewerHeartbeat.ts`

Owns viewer presence only.

Responsibilities:

- Generate and hold `sessionId`.
- While `isPlaying && isActive`, POST `/api/viewers/heartbeat` immediately, then every 20s.
- Clear the heartbeat interval when playback stops, stream becomes inactive, or component unmounts.
- Treat heartbeat failure as non-fatal and log only in development.
- Return `viewerCount`.

### `HLSPlayerView.tsx`

Rendering module. It receives all state/actions via props and renders the same JSX/classes/SVGs as the current player.

Responsibilities:

- Loading overlay.
- Offline state with next scheduled service countdown.
- Active-but-feed-offline state with retry button.
- Error state.
- `<video>` element.
- Play overlay.
- Unmute overlay.
- Live indicator and viewer count.
- Custom controls: progress/live bar, play/pause, volume, time, fullscreen.

### `playerUtils.ts`

Pure helpers:

- `formatTime(seconds)`
- `formatCountdown(targetIso, now = new Date())`
- `getPlayerPoster(posterUrl, fallbackPoster)` if useful during extraction.

`formatCountdown` accepts an injectable `now` to make tests deterministic.

## Behaviour to Preserve

- Fetch `/api/stream` on mount.
- Use backend `streamUrl` only when `isActive`; otherwise fallback to explicit `src`.
- Native HLS when supported; dynamic `hls.js` import otherwise.
- Fatal HLS network/default errors mark stream offline and start 30s retry loop.
- Media fatal errors attempt `recoverMediaError()` first.
- Autoplay muted once per source setup.
- Attendance check-in on first play only.
- Viewer heartbeat only while `isPlaying && isActive`, every 20s.
- Countdown for next scheduled service; poll `/api/stream` every 10s after countdown ends.
- Existing custom controls, keyboard shortcuts, volume, progress, fullscreen behaviour.
- Existing Tailwind classes and SVGs.

## Testing Strategy

- Add `playerUtils.test.ts` for pure helper behaviour:
  - `formatTime`: invalid input, seconds, minutes, hours.
  - `formatCountdown`: null target, ended target, under one minute, normal days/hours/minutes.
  - `getPlayerPoster` if extracted.
- Run existing unit tests.
- Run lint and production build.
- Manual smoke path after deployment or local dev if desired:
  - player loads inactive state,
  - countdown displays when `nextScheduled` exists,
  - active stream path still renders video,
  - play/pause/volume/fullscreen controls still respond.

## Rollout

Single PR with no database migrations. The refactor should be visually and behaviourally neutral.

## Risks and Mitigations

- **Hook dependency churn**: moving effects can accidentally change dependency arrays. Mitigation: preserve current effect triggers as closely as possible and avoid behavioural rewrites.
- **Stale refs/state**: current code uses refs for `isActive` and `streamOffline` to avoid stale event handlers. Mitigation: preserve those refs in `useHlsStream`.
- **HLS cleanup leaks**: instance and intervals must be destroyed on source changes and unmount. Mitigation: keep existing cleanup logic intact inside the hook.
- **View prop bloat**: the view will need many props. This is acceptable for this PR because the goal is separating view from behaviour; prop grouping can be refined later if needed.

## Self-review

- No placeholders remain.
- Scope is limited to the player split.
- No database/API changes.
- Behaviour preservation is explicit.
- Tests focus on pure helpers and existing project verification commands.
