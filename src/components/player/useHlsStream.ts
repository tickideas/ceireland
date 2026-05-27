'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import type Hls from 'hls.js'
import { formatCountdown, getPlayerPoster } from './playerUtils'

const isDev = process.env.NODE_ENV !== 'production'

interface UseHlsStreamOptions {
  src?: string
  poster?: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  progressRef: React.RefObject<HTMLDivElement | null>
}

export function useHlsStream({
  src,
  poster = '/poster.jpg',
  videoRef,
  containerRef,
  progressRef,
}: UseHlsStreamOptions) {
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
  const retryStreamRef = useRef<(() => Promise<void>) | null>(null)
  const retryCountRef = useRef(0)
  const isActiveRef = useRef(false)
  const streamOfflineRef = useRef(false)
  const countdownEndedRef = useRef(false)

  // Custom controls state
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTimeUpdateRef = useRef(0)

  const getVideoSrc = useCallback(() => {
    if (streamUrl && isActive) return streamUrl
    if (src && src.trim().length > 0) return src
    return ''
  }, [streamUrl, isActive, src])

  const attemptAutoplay = (video: HTMLVideoElement) => {
    if (autoplayAttemptedRef.current) return
    autoplayAttemptedRef.current = true
    try {
      video.muted = true
      video.autoplay = true
      video.setAttribute('playsinline', 'true')

      const p = video.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (isDev) console.log('[HLSPlayer] Autoplay succeeded (muted)')
        }).catch(err => {
          if (isDev) {
            if (err?.name === 'NotAllowedError') {
              console.log('[HLSPlayer] Autoplay blocked by policy; user interaction required')
            } else if (err?.name === 'AbortError') {
              console.log('[HLSPlayer] Autoplay aborted, likely due to src change')
            } else {
              console.log('[HLSPlayer] Autoplay attempt failed:', err)
            }
          }
        })
      }
    } catch (err) {
      if (isDev) console.log('[HLSPlayer] Autoplay exception:', err)
    }
  }

  const fetchStreamSettings = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/stream', { signal })
      if (response.ok) {
        const data = await response.json()
        if (isDev) console.log('[HLSPlayer] Stream settings fetched:', { streamUrl: data.streamUrl, isActive: data.isActive, posterUrl: data.posterUrl })
        setStreamUrl(data.streamUrl)
        setIsActive(data.isActive)
        isActiveRef.current = data.isActive // Sync ref immediately
        setPosterUrl(data.posterUrl || null)
        setNextScheduled(data.nextScheduled || null)
        setNextScheduledLabel(data.nextScheduledLabel || null)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (isDev) console.log('[HLSPlayer] Fetch aborted')
        return
      }
      if (isDev) console.error('[HLSPlayer] Failed to fetch stream settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const retryStream = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    const currentSrc = getVideoSrc()
    if (!currentSrc) return

    try {
      // First check if stream URL is accessible
      await fetch(currentSrc, { method: 'HEAD', mode: 'no-cors' })

      if (isDev) console.log('[HLSPlayer] Stream check completed, attempting reload')

      // Clear offline state and try to reload
      setStreamOffline(false)
      streamOfflineRef.current = false
      setError('')

      // Destroy existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      // Clear retry interval if successful
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }

      // Re-trigger the stream setup by updating a state
      // This will cause the useEffect to re-run
      setStreamUrl(() => {
        // Force a re-render by setting to null then back
        setTimeout(() => setStreamUrl(currentSrc), 100)
        return null
      })
    } catch {
      if (isDev) console.log('[HLSPlayer] Stream still offline, will retry...')
    }
  }, [getVideoSrc, videoRef])

  useEffect(() => {
    retryStreamRef.current = retryStream
  }, [retryStream])

  const startRetryLoop = useCallback(() => {
    // Clear any existing retry interval
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
    }

    retryCountRef.current = 0

    // Retry every 30 seconds (gentle on server)
    retryIntervalRef.current = setInterval(() => {
      retryCountRef.current += 1
      if (isDev) console.log(`[HLSPlayer] Retry attempt ${retryCountRef.current}`)

      // Try to reload the stream using the latest retry callback.
      void retryStreamRef.current?.()
    }, 30000)
  }, [])

  const stopRetryLoop = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
      retryIntervalRef.current = null
    }
    retryCountRef.current = 0
  }, [])

  useEffect(() => {
    if (isDev) console.log('[HLSPlayer] Component mounted')
    abortControllerRef.current = new AbortController()
    fetchStreamSettings(abortControllerRef.current.signal)
    return () => {
      if (isDev) console.log('[HLSPlayer] Component unmounting')
      if (hlsRef.current) {
        if (isDev) console.log('[HLSPlayer] Destroying HLS instance on unmount')
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      if (isDev) console.log('[HLSPlayer] Video play event fired')
      setIsPlaying(true)
      // Clear offline state when playback succeeds
      setStreamOffline(false)
      streamOfflineRef.current = false
      setError('')
      stopRetryLoop()
      if (!checkedInRef.current) {
        checkedInRef.current = true
        fetch('/api/attendance/checkin', { method: 'POST' }).catch((e) => {
          if (isDev) console.log('[HLSPlayer] check-in failed (non-fatal):', e)
        })
      }
    }
    const handlePause = () => {
      if (isDev) console.log('[HLSPlayer] Video pause event fired')
      setIsPlaying(false)
    }
    const handleError = () => {
      // If already in offline state, don't process further errors
      if (streamOfflineRef.current) {
        if (isDev) console.log('[HLSPlayer] Ignoring video error - already in offline state')
        return
      }

      const video = videoRef.current
      const mediaError = video?.error || null
      const errorCode = mediaError?.code ?? null

      if (isDev) {
        const errorCodeMeaning =
          errorCode === 1 ? 'aborted'
            : errorCode === 2 ? 'network'
              : errorCode === 3 ? 'decode'
                : errorCode === 4 ? 'src_not_supported'
                  : null

        console.error('[HLSPlayer] Video error event', {
          mediaErrorCode: errorCode,
          mediaErrorMeaning: errorCodeMeaning,
          currentSrc: video?.currentSrc,
          readyState: video?.readyState,
          networkState: video?.networkState,
          hasHlsInstance: !!hlsRef.current,
          isActive: isActiveRef.current
        })
      }

      // When stream is marked as active, treat ALL errors as "stream offline"
      // This means the feed ended or is unavailable, not a user-side error
      // Only show actual error when service is not active (likely a config issue)
      if (isActiveRef.current) {
        // Abort errors (code 1) are usually from source changes, ignore silently
        if (errorCode === 1) return

        setStreamOffline(true)
        streamOfflineRef.current = true
        setError('')
        startRetryLoop()
      } else {
        setError('Failed to load video. Please check your connection.')
      }
    }
    const emitResize = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ceireland-player-resize'))
      }
    }
    const handleLoadedMetadata = () => { if (isDev) console.log('[HLSPlayer] Video loadedmetadata'); emitResize() }
    const handleLoadedData = () => { if (isDev) console.log('[HLSPlayer] Video loadeddata'); emitResize() }
    const handleCanPlay = () => { if (isDev) console.log('[HLSPlayer] Video canplay'); emitResize() }
    const handleEnded = () => {
      if (isDev) console.log('[HLSPlayer] Video ended')
      // If service is still active but stream ended, show offline state
      if (isActiveRef.current) {
        setStreamOffline(true)
        streamOfflineRef.current = true
        setIsPlaying(false)
        startRetryLoop()
      }
    }
    const handleVolumeChange = () => {
      const v = videoRef.current
      if (!v) return
      setIsMuted(v.muted || v.volume === 0)
      setVolume(v.volume)
    }
    const handleTimeUpdate = () => {
      const v = videoRef.current
      if (!v) return
      const now = performance.now()
      if (now - lastTimeUpdateRef.current < 250) return
      lastTimeUpdateRef.current = now
      setCurrentTime(v.currentTime)
      // Update buffered
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1))
      }
    }
    const handleDurationChange = () => {
      const v = videoRef.current
      if (!v) return
      setDuration(v.duration || 0)
    }
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    handleVolumeChange()

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleError)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep refs in sync with state
  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    streamOfflineRef.current = streamOffline
  }, [streamOffline])

  useEffect(() => {
    const currentSrc = streamUrl && isActive ? streamUrl : src && src.trim().length > 0 ? src : ''
    if (isDev) console.log('[HLSPlayer] Video src changed to:', currentSrc)
  }, [streamUrl, isActive, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!isActive) {
      if (isDev) console.log('[HLSPlayer] Stream inactive, pausing video and clearing source')
      video.pause()
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.removeAttribute('src')
      video.load()
    }
  }, [isActive, videoRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const currentSrc = getVideoSrc()
    if (isDev) console.log('[HLSPlayer] Setting up video source:', currentSrc)

    autoplayAttemptedRef.current = false

    if (hlsRef.current) {
      if (isDev) console.log('[HLSPlayer] Destroying previous HLS instance')
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (streamUrl && isActive && currentSrc.includes('.m3u8')) {
      if (isDev) console.log('[HLSPlayer] Attempting to load HLS stream:', currentSrc)

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        if (isDev) console.log('[HLSPlayer] Using native HLS support')
        video.src = currentSrc
        video.load()
        attemptAutoplay(video)
        return () => {
          cancelled = true
        }
      }

      import('hls.js').then(({ default: Hls }) => {
        if (cancelled) return

        if (Hls.isSupported()) {
          if (isDev) console.log('[HLSPlayer] Initializing HLS.js with CORS-friendly config')

          const hls = new Hls({
            enableWorker: false,
            debug: isDev,
            xhrSetup: (xhr) => {
              xhr.withCredentials = false
            },
            maxLoadingDelay: 4,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            loader: Hls.DefaultConfig.loader,
          })

          if (cancelled) {
            hls.destroy()
            return
          }

          hlsRef.current = hls

          hls.loadSource(currentSrc)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isDev) console.log('[HLSPlayer] HLS manifest parsed successfully')
            attemptAutoplay(video)
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            const info = {
              type: data?.type,
              details: data?.details,
              fatal: Boolean(data?.fatal),
              url: data?.url,
              response: data?.response?.code,
              error: data?.error?.message || data?.error || undefined,
            }

            if (info.fatal) {
              if (isDev) console.error('[HLSPlayer] HLS fatal error:', info)
              switch (data?.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  if (isDev) console.error('[HLSPlayer] Network error - stream may be offline')
                  hls.destroy()
                  hlsRef.current = null
                  // Mark stream as offline and start retry loop
                  setStreamOffline(true)
                  streamOfflineRef.current = true
                  setError('')
                  startRetryLoop()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  if (isDev) console.error('[HLSPlayer] Media error - trying to recover')
                  try {
                    hls.recoverMediaError()
                  } catch {
                    // Recovery failed, treat as offline
                    hls.destroy()
                    hlsRef.current = null
                    setStreamOffline(true)
                    streamOfflineRef.current = true
                    setError('')
                    startRetryLoop()
                  }
                  break
                default:
                  if (isDev) console.error('[HLSPlayer] Fatal HLS error - stream may be offline')
                  hls.destroy()
                  hlsRef.current = null
                  // Treat as offline rather than error
                  setStreamOffline(true)
                  streamOfflineRef.current = true
                  setError('')
                  startRetryLoop()
              }
            } else {
              if (isDev) console.warn('[HLSPlayer] HLS non-fatal error:', info)
            }
          })

          if (isDev) {
            hls.on(Hls.Events.MANIFEST_LOADING, () => {
              console.log('[HLSPlayer] HLS manifest loading')
            })

            hls.on(Hls.Events.LEVEL_LOADING, () => {
              console.log('[HLSPlayer] HLS level loading')
            })
          }
        } else {
          if (cancelled) return
          if (isDev) console.error('[HLSPlayer] HLS not supported in this browser')
          video.src = currentSrc
          video.load()
          attemptAutoplay(video)
        }
      }).catch((err) => {
        if (cancelled) return
        if (isDev) console.error('[HLSPlayer] Failed to load hls.js:', err)
        video.src = currentSrc
        video.load()
        attemptAutoplay(video)
      })
    } else if (currentSrc) {
      if (isDev) console.log('[HLSPlayer] Using regular video source:', currentSrc)
      video.src = currentSrc
      video.load()
      attemptAutoplay(video)
    }

    return () => {
      cancelled = true
      if (hlsRef.current) {
        if (isDev) console.log('[HLSPlayer] Cleaning up HLS instance')
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [getVideoSrc, isActive, src, startRetryLoop, streamUrl, videoRef])


  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      if (isDev) console.log('[HLSPlayer] togglePlay called but video ref is null')
      return
    }

    if (isDev) console.log('[HLSPlayer] togglePlay called, video.paused:', video.paused, 'video.src:', video.src, 'video.readyState:', video.readyState)

    if (video.readyState === 0 && !video.src) {
      if (isDev) console.log('[HLSPlayer] Video not ready, src not set')
      setError('Video source not available. Please wait for stream to load.')
      return
    }

    if (video.paused) {
      if (isDev) console.log('[HLSPlayer] Calling video.play()')
      const playPromise = video.play()
      playPromise.then(() => {
        if (isDev) console.log('[HLSPlayer] video.play() resolved successfully')
      }).catch(e => {
        if (isDev) console.error('[HLSPlayer] video.play() failed:', e)
        if (e.name === 'AbortError') {
          if (isDev) console.log('[HLSPlayer] Play was aborted, likely due to src change or element removal')
          setError('Playback was interrupted. Please try again.')
        } else if (e.name === 'NotAllowedError') {
          if (isDev) console.log('[HLSPlayer] Autoplay not allowed by browser')
          setError('Autoplay is blocked by your browser. Please click play manually.')
        } else {
          setError('Failed to play video. Please try again.')
        }
      })
    } else {
      if (isDev) console.log('[HLSPlayer] Calling video.pause()')
      video.pause()
    }
  }, [videoRef])



  useEffect(() => {
    if (!nextScheduled || isActive) {
      setCountdown('')
      countdownEndedRef.current = false
      return
    }

    // Reset flag when nextScheduled changes
    countdownEndedRef.current = false
    let pollInterval: NodeJS.Timeout | null = null

    const updateCountdown = () => {
      const result = formatCountdown(nextScheduled)
      setCountdown(result.text)

      // When countdown ends, start polling to switch to player
      if (result.ended && !countdownEndedRef.current) {
        countdownEndedRef.current = true
        fetchStreamSettings()

        // Poll every 10 seconds until stream becomes active
        pollInterval = setInterval(() => {
          fetchStreamSettings()
        }, 10000)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => {
      clearInterval(interval)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [nextScheduled, isActive])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      if (isDev) console.error('[HLSPlayer] Fullscreen error:', err)
    }
  }, [containerRef])

  // Handle progress bar click for seeking
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const progress = progressRef.current
    if (!video || !progress || !duration) return

    const rect = progress.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * duration
  }

  // Handle mouse move to show/hide controls
  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const hideControlsIfPlaying = useCallback(() => {
    if (isPlaying) {
      setShowControls(false)
    }
  }, [isPlaying])

  const unmute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = false
    if (video.volume === 0) {
      video.volume = 1
      setVolume(1)
    }
    setIsMuted(false)
  }, [videoRef])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [videoRef])

  // Handle volume change
  const handleVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    video.muted = newVolume === 0
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if player is active and visible
      if (!isActive || streamOffline || loading) return
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'arrowright':
          e.preventDefault()
          // Only seek if not a live stream
          if (videoRef.current && duration > 0 && isFinite(duration)) {
            videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration)
          }
          break
        case 'arrowleft':
          e.preventDefault()
          // Only seek if not a live stream
          if (videoRef.current && duration > 0 && isFinite(duration)) {
            videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [duration, isActive, loading, streamOffline, toggleFullscreen, toggleMute, togglePlay, videoRef])


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
    poster: getPlayerPoster(posterUrl, poster),
    retryStream,
    togglePlay,
    toggleFullscreen,
    hideControlsIfPlaying,
    unmute,
    toggleMute,
    handleProgressClick,
    handleMouseMove,
    handleVolumeInput,
  }
}
