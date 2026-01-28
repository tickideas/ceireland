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
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState<number | null>(null)

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
          hasHlsInstance: !!hlsRef.current
        })
      }

      setError('Failed to load video. Please check your connection.')
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
  }, [])

  useEffect(() => {
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
                  if (isDev) console.error('[HLSPlayer] Network error - trying alternative approach')
                  hls.destroy()
                  hlsRef.current = null
                  video.src = currentSrc
                  video.load()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  if (isDev) console.error('[HLSPlayer] Media error - trying to recover')
                  hls.recoverMediaError()
                  break
                default:
                  if (isDev) console.error('[HLSPlayer] Fatal HLS error - destroying instance')
                  hls.destroy()
                  hlsRef.current = null
                  setError('Failed to load HLS stream. The stream may not be accessible from this domain.')
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <div className="text-sm">Loading stream...</div>
          </div>
        </div>
      )}

      {!loading && !isActive && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
          <div className="text-center px-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Stream Currently Offline</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              There is no active service at this time. Please check back soon or view our schedule below.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 text-white p-4">
          <div className="text-center">
            <div className="text-xl font-bold mb-2">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className={`w-full h-full ${!isActive && !loading ? 'hidden' : ''}`}
        controls
        preload="metadata"
        poster={getPoster()}
        playsInline
      >
        Your browser does not support the video tag.
      </video>

      {/* Custom Play Overlay */}
      {!isPlaying && !error && !loading && isActive && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black bg-opacity-30 hover:bg-opacity-20 transition-all"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all">
            <svg className="w-12 h-12 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Unmute Overlay */}
      {isPlaying && isMuted && !error && !loading && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/0"
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
          <div className="px-4 py-2 rounded-full bg-white/80 text-gray-900 text-sm font-medium shadow">
            Click to unmute
          </div>
        </div>
      )}

      {/* Live Indicator with Viewer Count */}
      {isActive && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold animate-pulse flex items-center justify-center">
          {viewerCount !== null && viewerCount > 0 ? (
            <span>LIVE • {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span>
          ) : (
            <span>LIVE</span>
          )}
        </div>
      )}
    </div>
  )
}
