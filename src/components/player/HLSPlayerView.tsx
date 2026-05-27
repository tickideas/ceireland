'use client'

import type { ChangeEvent, MouseEvent, RefObject } from 'react'
import { formatTime } from './playerUtils'

interface HLSPlayerViewProps {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  progressRef: RefObject<HTMLDivElement | null>
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
  poster: string
  retryStream: () => Promise<void>
  togglePlay: () => void
  toggleFullscreen: () => Promise<void>
  hideControlsIfPlaying: () => void
  unmute: () => void
  toggleMute: () => void
  handleProgressClick: (e: MouseEvent<HTMLDivElement>) => void
  handleMouseMove: () => void
  handleVolumeInput: (e: ChangeEvent<HTMLInputElement>) => void
}

export default function HLSPlayerView({
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
  poster,
  retryStream,
  togglePlay,
  toggleFullscreen,
  hideControlsIfPlaying,
  unmute,
  toggleMute,
  handleProgressClick,
  handleMouseMove,
  handleVolumeInput,
}: HLSPlayerViewProps) {
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={hideControlsIfPlaying}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center px-4">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-white mb-3 sm:mb-4 mx-auto"></div>
            <div className="text-xs sm:text-sm">Loading stream...</div>
          </div>
        </div>
      )}

      {!loading && !isActive && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
          <div className="text-center px-4 sm:px-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-xl font-semibold mb-1.5 sm:mb-2">Stream Currently Offline</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto">
              There is no active service at this time.
            </p>
            {nextScheduled && (
              <div className="mt-4 space-y-2">
                <p className="text-xs sm:text-sm text-gray-300 font-medium">
                  Next: {nextScheduledLabel || 'Service'}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs sm:text-sm font-semibold text-white">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  {countdown || 'Starting soon'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stream Offline State - shown when service is active but stream feed is unavailable */}
      {streamOffline && isActive && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <div className="text-center px-4 sm:px-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-slate-700 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 sm:w-10 sm:h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-xl font-semibold mb-1.5 sm:mb-2">Stream Starting Soon</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto mb-4">
              The live stream is not available yet. We&apos;ll automatically connect when it goes live.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs sm:text-sm mb-4">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span>Checking for stream...</span>
            </div>
            <button
              onClick={() => retryStream()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              Try Now
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 text-white p-3 sm:p-4">
          <div className="text-center">
            <div className="text-base sm:text-xl font-bold mb-1.5 sm:mb-2">Error</div>
            <div className="text-xs sm:text-sm max-w-xs">{error}</div>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className={`w-full h-full ${(!isActive && !loading) || streamOffline ? 'hidden' : ''}`}
        preload="metadata"
        poster={poster}
        playsInline
        onClick={togglePlay}
      >
        Your browser does not support the video tag.
      </video>

      {/* Custom Play Overlay */}
      {!isPlaying && !error && !loading && isActive && !streamOffline && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black bg-opacity-30 hover:bg-opacity-20 active:bg-opacity-10 transition-all touch-manipulation"
          onClick={togglePlay}
        >
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 active:scale-95 transition-all">
            <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-900 ml-0.5 sm:ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Unmute Overlay */}
      {isPlaying && isMuted && !error && !loading && !streamOffline && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/0 touch-manipulation"
          onClick={unmute}
          aria-label="Click to unmute"
          role="button"
        >
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 text-gray-900 text-xs sm:text-sm font-medium shadow active:bg-white/90">
            Tap to unmute
          </div>
        </div>
      )}

      {/* Live Indicator with Viewer Count - only show when actually streaming */}
      {isActive && !streamOffline && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold animate-pulse flex items-center justify-center z-20">
          {viewerCount !== null && viewerCount > 0 ? (
            <span className="whitespace-nowrap">LIVE <span className="hidden sm:inline">• {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span></span>
          ) : (
            <span>LIVE</span>
          )}
        </div>
      )}

      {/* Custom Controls Overlay */}
      {isActive && !streamOffline && !error && !loading && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Progress Bar - only show for non-live/seekable content */}
          {duration > 0 && isFinite(duration) && (
            <div
              ref={progressRef}
              className="relative h-1 hover:h-1.5 mx-4 mb-2 cursor-pointer group/progress transition-all"
              onClick={handleProgressClick}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-white/30 rounded-full" />
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 bg-white/50 rounded-full"
                style={{ width: `${(buffered / duration) * 100}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 bg-red-500 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                {/* Progress handle */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg" />
              </div>
            </div>
          )}

          {/* Live indicator bar - shown for live streams */}
          {(!duration || !isFinite(duration) || duration === 0) && (
            <div className="relative h-1 mx-4 mb-2">
              <div className="absolute inset-0 bg-red-500/50 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse" />
              </div>
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center gap-2 sm:gap-4 px-4 pb-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="text-white hover:text-white/80 transition-colors p-1"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeInput}
                className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-200 accent-white h-1 cursor-pointer"
              />
            </div>

            {/* Time */}
            <div className="text-white text-xs sm:text-sm font-medium tabular-nums">
              {duration > 0 && isFinite(duration) ? (
                <>{formatTime(currentTime)} / {formatTime(duration)}</>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
