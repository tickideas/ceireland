# HLSPlayer Split Implementation Plan

> **REQUIRED SUB-SKILL:** Use `/skill:subagent-driven-development` (recommended) or `/skill:executing-plans` to implement this plan task-by-task.

**Goal:** Split `src/components/HLSPlayer.tsx` into focused Modules for stream lifecycle, viewer heartbeat, pure player utilities, and view rendering while preserving current behaviour.

**Architecture:** Keep `HLSPlayer.tsx` as composition glue. Move viewer presence into `useViewerHeartbeat`, stream/playback lifecycle into `useHlsStream`, pure formatting into `playerUtils`, and JSX into `HLSPlayerView`. No API, database, or visual redesign changes.

**Tech Stack:** Next.js 16 App Router, React 19 hooks, TypeScript strict mode, Node test runner with `tsx`, HLS.js dynamic import.

---

## Current Baseline

- Current file: `src/components/HLSPlayer.tsx` (~1,035 LoC).
- Current behaviour must be preserved:
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

## File Structure

Create:

- `src/components/player/playerUtils.ts`
  - Pure helpers: `formatTime`, `formatCountdown`, `getPlayerPoster`.
- `src/components/player/playerUtils.test.ts`
  - Unit tests for pure helper behaviour.
- `src/components/player/useViewerHeartbeat.ts`
  - Viewer presence Module; owns session id, heartbeat interval, viewer count.
- `src/components/player/useHlsStream.ts`
  - Stream lifecycle and playback controller Module.
- `src/components/player/HLSPlayerView.tsx`
  - Rendering Module; all JSX/classes/SVGs moved from current `HLSPlayer.tsx`.

Modify:

- `src/components/HLSPlayer.tsx`
  - Replace current implementation with composition glue that calls hooks and renders view.

---

## Task 1: Create pure player utilities with tests

**TDD scenario:** New pure helpers — write tests first, then implementation.

**Files:**
- Create: `src/components/player/playerUtils.test.ts`
- Create: `src/components/player/playerUtils.ts`

**Why this task exists:** `formatTime` and `formatCountdown` are currently embedded inside the giant component. Moving them first creates a safe, tested seam before moving the larger hook/view code.

- [ ] **Step 1: Write the failing test**

Create `src/components/player/playerUtils.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCountdown, formatTime, getPlayerPoster } from './playerUtils'

test('formatTime returns 0:00 for invalid input', () => {
  assert.equal(formatTime(Number.NaN), '0:00')
  assert.equal(formatTime(Number.POSITIVE_INFINITY), '0:00')
})

test('formatTime formats seconds and minutes as M:SS', () => {
  assert.equal(formatTime(0), '0:00')
  assert.equal(formatTime(7), '0:07')
  assert.equal(formatTime(65), '1:05')
})

test('formatTime formats hours as H:MM:SS', () => {
  assert.equal(formatTime(3600), '1:00:00')
  assert.equal(formatTime(3661), '1:01:01')
})

test('formatCountdown returns blank when no target is provided', () => {
  assert.deepEqual(formatCountdown(null, new Date('2030-01-01T00:00:00.000Z')), {
    text: '',
    ended: false,
  })
})

test('formatCountdown marks elapsed targets as starting now', () => {
  assert.deepEqual(
    formatCountdown('2030-01-01T00:00:00.000Z', new Date('2030-01-01T00:00:01.000Z')),
    { text: 'Starting now', ended: true },
  )
})

test('formatCountdown shows seconds when under one minute', () => {
  assert.deepEqual(
    formatCountdown('2030-01-01T00:00:45.000Z', new Date('2030-01-01T00:00:00.000Z')),
    { text: '45s', ended: false },
  )
})

test('formatCountdown shows days hours and minutes for longer durations', () => {
  assert.deepEqual(
    formatCountdown('2030-01-03T04:05:30.000Z', new Date('2030-01-01T00:00:00.000Z')),
    { text: '2d 4h 5m', ended: false },
  )
})

test('getPlayerPoster prefers non-empty stream poster over fallback', () => {
  assert.equal(getPlayerPoster('/stream-poster.jpg', '/fallback.jpg'), '/stream-poster.jpg')
  assert.equal(getPlayerPoster('   ', '/fallback.jpg'), '/fallback.jpg')
  assert.equal(getPlayerPoster(null, '/fallback.jpg'), '/fallback.jpg')
  assert.equal(getPlayerPoster(undefined, undefined), '/poster.jpg')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/components/player/playerUtils.test.ts
```

Expected: test runner reports module/function not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/player/playerUtils.ts`:

```ts
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatCountdown(
  targetIso: string | null,
  now: Date = new Date(),
): { text: string; ended: boolean } {
  if (!targetIso) return { text: '', ended: false }
  const target = new Date(targetIso)
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return { text: 'Starting now', ended: true }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (totalSeconds < 60) {
    return { text: `${seconds}s`, ended: false }
  }

  return { text: `${days}d ${hours}h ${minutes}m`, ended: false }
}

export function getPlayerPoster(
  posterUrl: string | null | undefined,
  fallbackPoster: string | undefined,
): string {
  return posterUrl && posterUrl.trim().length > 0 ? posterUrl : (fallbackPoster || '/poster.jpg')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/components/player/playerUtils.test.ts
```

Expected: all `playerUtils` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/player/playerUtils.ts src/components/player/playerUtils.test.ts
git commit -m "test(player): add pure player utility tests"
```

---

## Task 2: Extract viewer heartbeat hook

**TDD scenario:** Refactoring browser hook logic — run existing tests first, then extract, then run full tests/lint/build.

**Files:**
- Create: `src/components/player/useViewerHeartbeat.ts`
- Modify: `src/components/HLSPlayer.tsx`

**Why this task exists:** Viewer presence is an independent Module: it depends only on `isPlaying` and `isActive`, owns its interval, and returns `viewerCount`. This is the cleanest first behavioural extraction.

- [ ] **Step 1: Verify baseline**

Run:

```bash
npm test
npm run lint
```

Expected: tests and lint pass before refactor.

- [ ] **Step 2: Create `useViewerHeartbeat.ts`**

Create `src/components/player/useViewerHeartbeat.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'

const isDev = process.env.NODE_ENV !== 'production'

interface UseViewerHeartbeatOptions {
  isPlaying: boolean
  isActive: boolean
}

export function useViewerHeartbeat({ isPlaying, isActive }: UseViewerHeartbeatOptions) {
  const sessionIdRef = useRef<string | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [viewerCount, setViewerCount] = useState<number | null>(null)

  useEffect(() => {
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const sendHeartbeat = async () => {
      if (!sessionIdRef.current) return

      try {
        const response = await fetch('/api/viewers/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        })

        if (response.ok) {
          const data = await response.json()
          setViewerCount(data.viewerCount)
        }
      } catch (error) {
        if (isDev) console.log('[HLSPlayer] Heartbeat failed (non-fatal):', error)
      }
    }

    if (isPlaying && isActive) {
      sendHeartbeat()
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 20000)
    } else if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [isPlaying, isActive])

  return { viewerCount }
}
```

- [ ] **Step 3: Modify `HLSPlayer.tsx` to use the hook**

In `src/components/HLSPlayer.tsx`:

1. Add import:

```ts
import { useViewerHeartbeat } from './player/useViewerHeartbeat'
```

2. Delete these refs/state:

```ts
const sessionIdRef = useRef<string | null>(null)
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
const [viewerCount, setViewerCount] = useState<number | null>(null)
```

3. Add this after `isPlaying` and `isActive` exist:

```ts
const { viewerCount } = useViewerHeartbeat({ isPlaying, isActive })
```

4. In the mount/unmount effect, delete the `sessionIdRef.current = ...` line and the heartbeat interval cleanup block.

5. Delete the entire heartbeat `useEffect` block that posts to `/api/viewers/heartbeat`.

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all pass. The UI still compiles and viewer count is still passed to the existing JSX.

- [ ] **Step 5: Commit**

```bash
git add src/components/HLSPlayer.tsx src/components/player/useViewerHeartbeat.ts
git commit -m "refactor(player): extract viewer heartbeat hook"
```

---

## Task 3: Extract HLS stream lifecycle hook

**TDD scenario:** Large behavioural refactor — preserve existing logic first, then run full verification.

**Files:**
- Create: `src/components/player/useHlsStream.ts`
- Modify: `src/components/HLSPlayer.tsx`

**Why this task exists:** Stream lifecycle is the deepest Module hidden in `HLSPlayer.tsx`: `/api/stream` settings, HLS.js setup, retry loops, offline state, countdown polling, video listeners, and playback controls. Extracting it creates a clear Interface and lets `HLSPlayer.tsx` become composition glue.

- [ ] **Step 1: Create hook skeleton and types**

Create `src/components/player/useHlsStream.ts` with this header and interface:

```ts
'use client'

import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'
import { formatCountdown, getPlayerPoster } from './playerUtils'

const isDev = process.env.NODE_ENV !== 'production'

interface UseHlsStreamOptions {
  videoRef: MutableRefObject<HTMLVideoElement | null>
  containerRef: MutableRefObject<HTMLDivElement | null>
  progressRef: MutableRefObject<HTMLDivElement | null>
  src?: string
  poster?: string
}

export interface UseHlsStreamResult {
  isPlaying: boolean
  error: string
  streamOffline: boolean
  isActive: boolean
  loading: boolean
  isMuted: boolean
  nextScheduled: string | null
  nextScheduledLabel: string | null
  countdown: string
  currentTime: number
  duration: number
  buffered: number
  isFullscreen: boolean
  showControls: boolean
  volume: number
  posterSrc: string
  togglePlay: () => void
  retryStream: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseMove: () => void
  handleVolumeInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  hideControlsIfPlaying: () => void
  unmute: () => void
  toggleMute: () => void
}

export function useHlsStream({
  videoRef,
  containerRef,
  progressRef,
  src,
  poster = '/poster.jpg',
}: UseHlsStreamOptions): UseHlsStreamResult {
  // Move the existing implementation here in Step 2.
  throw new Error('useHlsStream implementation not moved yet')
}
```

- [ ] **Step 2: Move state, refs, effects, and actions from `HLSPlayer.tsx` into `useHlsStream.ts`**

Move these from `HLSPlayer.tsx` into `useHlsStream.ts` unchanged except where refs become passed-in options:

State/refs to move:

```ts
const hlsRef = useRef<Hls | null>(null)
const autoplayAttemptedRef = useRef(false)
const checkedInRef = useRef(false)
const abortControllerRef = useRef<AbortController | null>(null)
const [isPlaying, setIsPlaying] = useState(false)
const [error, setError] = useState('')
const [streamOffline, setStreamOffline] = useState(false)
const [streamUrl, setStreamUrl] = useState<string | null>(null)
const [isActive, setIsActive] = useState(false)
const [loading, setLoading] = useState(true)
const [isMuted, setIsMuted] = useState(true)
const [posterUrl, setPosterUrl] = useState<string | null>(null)
const [nextScheduled, setNextScheduled] = useState<string | null>(null)
const [nextScheduledLabel, setNextScheduledLabel] = useState<string | null>(null)
const [countdown, setCountdown] = useState<string>('')
const retryIntervalRef = useRef<NodeJS.Timeout | null>(null)
const retryCountRef = useRef(0)
const isActiveRef = useRef(false)
const streamOfflineRef = useRef(false)
const countdownEndedRef = useRef(false)
const [currentTime, setCurrentTime] = useState(0)
const [duration, setDuration] = useState(0)
const [buffered, setBuffered] = useState(0)
const [isFullscreen, setIsFullscreen] = useState(false)
const [showControls, setShowControls] = useState(true)
const [volume, setVolume] = useState(1)
const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
const lastTimeUpdateRef = useRef(0)
```

Callbacks/effects/actions to move:

- `getVideoSrc`
- `attemptAutoplay`
- `fetchStreamSettings`
- `retryStream`
- `startRetryLoop`
- `stopRetryLoop`
- mount/unmount effect (without heartbeat cleanup; that moved in Task 2)
- video event listener effect
- refs-sync effects for `isActive` and `streamOffline`
- debug effect for source changes
- inactive stream cleanup effect
- HLS setup effect
- `togglePlay`
- countdown effect (use imported `formatCountdown` instead of local function)
- `toggleFullscreen`
- `handleProgressClick`
- `handleMouseMove`
- `handleVolumeInput`
- keyboard shortcuts effect

Implementation details while moving:

- Replace local `getPoster()` with:

```ts
const posterSrc = getPlayerPoster(posterUrl, poster)
```

- Return this object at the bottom:

```ts
return {
  isPlaying,
  error,
  streamOffline,
  isActive,
  loading,
  isMuted,
  nextScheduled,
  nextScheduledLabel,
  countdown,
  currentTime,
  duration,
  buffered,
  isFullscreen,
  showControls,
  volume,
  posterSrc,
  togglePlay,
  retryStream,
  toggleFullscreen,
  handleProgressClick,
  handleMouseMove,
  handleVolumeInput,
  hideControlsIfPlaying: () => isPlaying && setShowControls(false),
  unmute: () => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    if (v.volume === 0) v.volume = 1
    setIsMuted(false)
  },
  toggleMute: () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  },
}
```

- Remove local `formatTime`, `formatCountdown`, and `getPoster` from `HLSPlayer.tsx`. `formatTime` will be used by the view in Task 4.

- [ ] **Step 3: Modify `HLSPlayer.tsx` to consume the hook while keeping JSX local**

In `src/components/HLSPlayer.tsx`:

1. Keep/create refs:

```ts
const videoRef = useRef<HTMLVideoElement>(null)
const containerRef = useRef<HTMLDivElement>(null)
const progressRef = useRef<HTMLDivElement>(null)
```

2. Call hook:

```ts
const player = useHlsStream({ videoRef, containerRef, progressRef, src, poster })
const { viewerCount } = useViewerHeartbeat({ isPlaying: player.isPlaying, isActive: player.isActive })
```

3. Replace existing local state/action references in JSX with `player.*` one pass at a time:

- `loading` → `player.loading`
- `isActive` → `player.isActive`
- `error` → `player.error`
- `streamOffline` → `player.streamOffline`
- `nextScheduled` → `player.nextScheduled`
- `nextScheduledLabel` → `player.nextScheduledLabel`
- `countdown` → `player.countdown`
- `retryStream` → `player.retryStream`
- `getPoster()` → `player.posterSrc`
- `togglePlay` → `player.togglePlay`
- `isPlaying` → `player.isPlaying`
- `isMuted` → `player.isMuted`
- inline unmute handler → `player.unmute`
- `showControls` → `player.showControls`
- `duration` → `player.duration`
- `buffered` → `player.buffered`
- `currentTime` → `player.currentTime`
- `handleProgressClick` → `player.handleProgressClick`
- `handleVolumeInput` → `player.handleVolumeInput`
- inline mute toggle → `player.toggleMute`
- `volume` → `player.volume`
- `isFullscreen` → `player.isFullscreen`
- `toggleFullscreen` → `player.toggleFullscreen`
- `handleMouseMove` → `player.handleMouseMove`
- `onMouseLeave={() => isPlaying && setShowControls(false)}` → `onMouseLeave={player.hideControlsIfPlaying}`

4. Import `formatTime` from player utils if JSX still uses it:

```ts
import { formatTime } from './player/playerUtils'
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all pass. `HLSPlayer.tsx` still renders the same JSX, but logic is now in `useHlsStream`.

- [ ] **Step 5: Commit**

```bash
git add src/components/HLSPlayer.tsx src/components/player/useHlsStream.ts
git commit -m "refactor(player): extract HLS stream lifecycle hook"
```

---

## Task 4: Extract HLSPlayerView rendering component

**TDD scenario:** View-only refactor — preserve JSX exactly, then run full verification.

**Files:**
- Create: `src/components/player/HLSPlayerView.tsx`
- Modify: `src/components/HLSPlayer.tsx`

**Why this task exists:** After Task 3, `HLSPlayer.tsx` still contains the large view. Moving JSX into a rendering component makes the top-level file shallow and turns the player view into a replaceable Adapter over the hook Interface.

- [ ] **Step 1: Create view prop interface**

Create `src/components/player/HLSPlayerView.tsx`:

```tsx
'use client'

import { type MutableRefObject } from 'react'
import { formatTime } from './playerUtils'

interface HLSPlayerViewProps {
  videoRef: MutableRefObject<HTMLVideoElement | null>
  containerRef: MutableRefObject<HTMLDivElement | null>
  progressRef: MutableRefObject<HTMLDivElement | null>
  viewerCount: number | null
  isPlaying: boolean
  error: string
  streamOffline: boolean
  isActive: boolean
  loading: boolean
  isMuted: boolean
  nextScheduled: string | null
  nextScheduledLabel: string | null
  countdown: string
  currentTime: number
  duration: number
  buffered: number
  isFullscreen: boolean
  showControls: boolean
  volume: number
  posterSrc: string
  togglePlay: () => void
  retryStream: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseMove: () => void
  handleVolumeInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  hideControlsIfPlaying: () => void
  unmute: () => void
  toggleMute: () => void
}

export function HLSPlayerView(props: HLSPlayerViewProps) {
  const {
    videoRef,
    containerRef,
    progressRef,
    viewerCount,
    isPlaying,
    error,
    streamOffline,
    isActive,
    loading,
    isMuted,
    nextScheduled,
    nextScheduledLabel,
    countdown,
    currentTime,
    duration,
    buffered,
    isFullscreen,
    showControls,
    volume,
    posterSrc,
    togglePlay,
    retryStream,
    toggleFullscreen,
    handleProgressClick,
    handleMouseMove,
    handleVolumeInput,
    hideControlsIfPlaying,
    unmute,
    toggleMute,
  } = props

  return null
}
```

- [ ] **Step 2: Move existing JSX into `HLSPlayerView`**

Move the entire `return (...)` JSX from `src/components/HLSPlayer.tsx` into `HLSPlayerView`, replacing local references with prop names. Preserve JSX/classes/SVGs exactly except these substitutions:

- `<video poster={getPoster()}>` should already be `<video poster={posterSrc}>` after Task 3.
- `onMouseLeave={player.hideControlsIfPlaying}` in Task 3 becomes `onMouseLeave={hideControlsIfPlaying}` inside the view.
- Unmute overlay `onClick` becomes `onClick={unmute}`.
- Mute button `onClick` becomes `onClick={toggleMute}`.
- `formatTime(...)` comes from `playerUtils` import.

- [ ] **Step 3: Replace `HLSPlayer.tsx` with composition glue**

After moving JSX, `src/components/HLSPlayer.tsx` should look like this shape:

```tsx
'use client'

import { useRef } from 'react'
import { HLSPlayerView } from './player/HLSPlayerView'
import { useHlsStream } from './player/useHlsStream'
import { useViewerHeartbeat } from './player/useViewerHeartbeat'

interface HLSPlayerProps {
  src?: string
  poster?: string
}

export default function HLSPlayer({ src, poster = '/poster.jpg' }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const player = useHlsStream({ videoRef, containerRef, progressRef, src, poster })
  const { viewerCount } = useViewerHeartbeat({
    isPlaying: player.isPlaying,
    isActive: player.isActive,
  })

  return (
    <HLSPlayerView
      videoRef={videoRef}
      containerRef={containerRef}
      progressRef={progressRef}
      viewerCount={viewerCount}
      {...player}
    />
  )
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all pass. `src/components/HLSPlayer.tsx` should now be under 50 LoC, and `HLSPlayerView.tsx` should contain the moved JSX.

- [ ] **Step 5: Commit**

```bash
git add src/components/HLSPlayer.tsx src/components/player/HLSPlayerView.tsx
git commit -m "refactor(player): extract HLS player view"
```

---

## Task 5: Final verification and PR

**TDD scenario:** Final integration verification.

**Files:**
- Modify only if lint/build exposes issues.

**Why this task exists:** The refactor touches a critical live-stream path. Final verification must prove tests, lint, and build all pass before PR.

- [ ] **Step 1: Run all verification commands**

Run:

```bash
npm test
npm run lint
npm run build
npx tsc --noEmit
```

Expected:

- `npm test`: all tests pass.
- `npm run lint`: no ESLint errors.
- `npm run build`: production build succeeds.
- `npx tsc --noEmit`: production code has no TypeScript errors. If unrelated `.test.ts` ESM errors appear, document them and verify production code is clean.

- [ ] **Step 2: Check diff shape**

Run:

```bash
git diff --stat main...HEAD
git diff --check
```

Expected:

- `src/components/HLSPlayer.tsx` is dramatically smaller.
- New files exist under `src/components/player/`.
- No whitespace errors.

- [ ] **Step 3: Open PR**

Write PR body to `/tmp/pr-body-hls-player-split.md`:

```md
## Summary

Architecture review candidate 5: split `HLSPlayer.tsx` into focused Modules while preserving current behaviour.

## What changed

- `HLSPlayer.tsx` is now composition glue.
- `useHlsStream` owns stream settings, HLS.js/native HLS setup, retry loop, countdown polling, playback state, controls, and video event listeners.
- `useViewerHeartbeat` owns viewer presence and `/api/viewers/heartbeat` interval.
- `HLSPlayerView` owns the existing JSX rendering.
- `playerUtils` owns pure formatting/poster helpers with unit tests.

## Behaviour preserved

- `/api/stream` fetch on mount.
- HLS.js/native HLS setup behaviour.
- Offline retry loop.
- Attendance check-in on first play.
- Viewer heartbeat while playing and active.
- Countdown and post-countdown polling.
- Existing controls and UI classes.

## Verification

- `npm test`
- `npm run lint`
- `npm run build`
- `npx tsc --noEmit`
```

Create PR:

```bash
gh pr create --base main --head refactor/hls-player-split --title "refactor(player): split HLSPlayer into focused modules" --body-file /tmp/pr-body-hls-player-split.md
```

Expected: GitHub returns PR URL.

---

## Plan Self-Review

- Spec coverage: all approved design requirements are covered by Tasks 1-5.
- Placeholder scan: no incomplete-marker or fill-in placeholders.
- Type consistency: `UseHlsStreamResult`, `HLSPlayerViewProps`, and utility functions are defined before use.
- Scope check: one subsystem only, the HLS player split.
