'use client'

import { useRef } from 'react'
import HLSPlayerView from './player/HLSPlayerView'
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
  const player = useHlsStream({ src, poster, videoRef, containerRef, progressRef })
  const { viewerCount } = useViewerHeartbeat({ isPlaying: player.isPlaying, isActive: player.isActive })

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
