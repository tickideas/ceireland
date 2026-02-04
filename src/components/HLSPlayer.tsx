'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const isActiveRef = useRef(false)
  const streamOfflineRef = useRef(false)

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

      // When stream is marked as active, treat most errors as "stream offline"
      // This means the feed is likely down, not a user-side error
      // Only show error for abort (user cancelled) or decode errors (corrupt stream)
      if (isActiveRef.current && errorCode !== 1 && errorCode !== 3) {
        setStreamOffline(true)
        streamOfflineRef.current = true
        setError('')
        startRetryLoop()
      } else if (errorCode === 1) {
        // Abort error - user cancelled, don't show error
        return
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
    const handleVolumeChange = () => {
      const v = videoRef.current
      if (!v) return
      setIsMuted(v.muted || v.volume === 0)
    }

    handleVolumeChange()

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('volumechange', handleVolumeChange)
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
                  hls.recoverMediaError()
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

  return (
    <div className="relative w-full h-full bg-black">
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
              There is no active service at this time. Please check back soon or view our schedule below.
            </p>
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
        controls
        preload="metadata"
        poster={getPoster()}
        playsInline
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
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold animate-pulse flex items-center justify-center">
          {viewerCount !== null && viewerCount > 0 ? (
            <span className="whitespace-nowrap">LIVE <span className="hidden sm:inline">• {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span></span>
          ) : (
            <span>LIVE</span>
          )}
        </div>
      )}
    </div>
  )
}
