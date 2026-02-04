'use client'

import { useEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'

const isDev = process.env.NODE_ENV !== 'production'

interface HLSPlayerProps {
  src?: string
  poster?: string
}

export default function HLSPlayer({ src, poster = '/poster.jpg' }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const autoplayAttemptedRef = useRef(false)
  const checkedInRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')
  const [streamOffline, setStreamOffline] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState<number | null>(null)
  const [nextScheduled, setNextScheduled] = useState<string | null>(null)
  const [nextScheduledLabel, setNextScheduledLabel] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<string>('')
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const isActiveRef = useRef(false)
  const streamOfflineRef = useRef(false)
  
  // Custom controls state
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [volume, setVolume] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const lastTimeUpdateRef = useRef(0)

  useEffect(() => {
    if (isDev) console.log('[HLSPlayer] Component mounted')
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    abortControllerRef.current = new AbortController()
    fetchStreamSettings(abortControllerRef.current.signal)
    return () => {
      if (isDev) console.log('[HLSPlayer] Component unmounting')
      if (hlsRef.current) {
        if (isDev) console.log('[HLSPlayer] Destroying HLS instance on unmount')
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const currentSrc = getVideoSrc()
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
  }, [isActive])

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
    } else {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [isPlaying, isActive])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

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
        return
      }

      import('hls.js').then(({ default: Hls }) => {
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
          if (isDev) console.error('[HLSPlayer] HLS not supported in this browser')
          video.src = currentSrc
          video.load()
          attemptAutoplay(video)
        }
      }).catch((err) => {
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
      if (hlsRef.current) {
        if (isDev) console.log('[HLSPlayer] Cleaning up HLS instance')
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
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

  const startRetryLoop = () => {
    // Clear any existing retry interval
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
    }

    retryCountRef.current = 0
    
    // Retry every 30 seconds (gentle on server)
    retryIntervalRef.current = setInterval(() => {
      retryCountRef.current += 1
      if (isDev) console.log(`[HLSPlayer] Retry attempt ${retryCountRef.current}`)
      
      // Try to reload the stream
      retryStream()
    }, 30000)
  }

  const retryStream = async () => {
    const video = videoRef.current
    if (!video) return

    const currentSrc = getVideoSrc()
    if (!currentSrc) return

    try {
      // First check if stream URL is accessible
      const response = await fetch(currentSrc, { method: 'HEAD', mode: 'no-cors' })
      
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
      setStreamUrl(prev => {
        // Force a re-render by setting to null then back
        setTimeout(() => setStreamUrl(currentSrc), 100)
        return null
      })
    } catch {
      if (isDev) console.log('[HLSPlayer] Stream still offline, will retry...')
    }
  }

  const stopRetryLoop = () => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
      retryIntervalRef.current = null
    }
    retryCountRef.current = 0
  }

  const getVideoSrc = () => {
    if (streamUrl && isActive) return streamUrl
    if (src && src.trim().length > 0) return src
    return ''
  }

  const getPoster = () => {
    return (posterUrl && posterUrl.trim().length > 0) ? posterUrl : (poster || '/poster.jpg')
  }

  const togglePlay = () => {
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
  }

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatCountdown = (targetIso: string | null): string => {
    if (!targetIso) return ''
    const target = new Date(targetIso)
    const now = new Date()
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return 'Starting now'

    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    return `${days}d ${hours}h ${minutes}m`
  }

  useEffect(() => {
    if (!nextScheduled || isActive) {
      setCountdown('')
      return
    }

    setCountdown(formatCountdown(nextScheduled))
    const interval = setInterval(() => {
      setCountdown(formatCountdown(nextScheduled))
    }, 1000)

    return () => clearInterval(interval)
  }, [nextScheduled, isActive])

  // Toggle fullscreen
  const toggleFullscreen = async () => {
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
  }

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
          const video = videoRef.current
          if (video) {
            video.muted = !video.muted
            setIsMuted(video.muted)
          }
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
  }, [isActive, streamOffline, loading, isPlaying, duration])

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
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
        poster={getPoster()}
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
          onClick={() => {
            const v = videoRef.current
            if (!v) return
            v.muted = false
            if (v.volume === 0) v.volume = 1
            setIsMuted(false)
          }}
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
                onClick={() => {
                  const video = videoRef.current
                  if (video) {
                    video.muted = !video.muted
                    setIsMuted(video.muted)
                  }
                }}
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
