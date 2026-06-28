'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

interface Props {
  videoId: string
  startSeconds: number
  onProgress: (seconds: number, duration: number) => void
  onEnded: () => void
}

export function YoutubePlayer({ videoId, startSeconds, onProgress, onEnded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let destroyed = false

    const startInterval = (player: YT.Player) => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        if (destroyed) return
        const current = player.getCurrentTime?.() ?? 0
        const duration = player.getDuration?.() ?? 0
        onProgress(current, duration)
      }, 5000)
    }

    const initPlayer = () => {
      if (!containerRef.current || destroyed) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        playerVars: { start: Math.floor(startSeconds), rel: 0 },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            const duration = e.target.getDuration()
            onProgress(startSeconds, duration)
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              startInterval(playerRef.current!)
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current)
              if (e.data === window.YT.PlayerState.ENDED) onEnded()
            }
          },
        },
      })
    }

    if (typeof window !== 'undefined') {
      if (window.YT?.Player) {
        initPlayer()
      } else {
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const script = document.createElement('script')
          script.src = 'https://www.youtube.com/iframe_api'
          document.head.appendChild(script)
        }
        const prev = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => {
          prev?.()
          initPlayer()
        }
      }
    }

    return () => {
      destroyed = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      playerRef.current?.destroy()
    }
  }, [videoId])

  return <div ref={containerRef} data-testid="yt-player-container" />
}
