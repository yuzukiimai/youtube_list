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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const readyRef = useRef(false)

  // Keep the latest callbacks/values in refs so the single persistent player
  // never holds a stale closure when the selected video changes.
  const onProgressRef = useRef(onProgress)
  const onEndedRef = useRef(onEnded)
  const startSecondsRef = useRef(startSeconds)
  onProgressRef.current = onProgress
  onEndedRef.current = onEnded
  startSecondsRef.current = startSeconds

  // Create the player exactly once.
  useEffect(() => {
    let destroyed = false

    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        const p = playerRef.current
        if (destroyed || !p) return
        onProgressRef.current(p.getCurrentTime?.() ?? 0, p.getDuration?.() ?? 0)
      }, 250)
    }

    const initPlayer = () => {
      if (!wrapperRef.current || destroyed || playerRef.current) return

      // The node the YouTube API replaces with its <iframe>. React only ever
      // manages `wrapperRef`, so it never tries to remove a swapped-out node.
      const host = document.createElement('div')
      host.style.width = '100%'
      host.style.height = '100%'
      wrapperRef.current.appendChild(host)

      playerRef.current = new window.YT.Player(host, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { start: Math.floor(startSecondsRef.current), rel: 0 },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            readyRef.current = true
            onProgressRef.current(startSecondsRef.current, e.target.getDuration())
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              startInterval()
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current)
              if (e.data === window.YT.PlayerState.ENDED) onEndedRef.current()
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
      try {
        playerRef.current?.destroy()
      } catch {
        // The iframe may already be detached; ignore.
      }
      playerRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap the video in-place when the selection changes (no remount).
  useEffect(() => {
    const p = playerRef.current
    // On first mount the player is created with this videoId already; skip until ready.
    if (!p || !readyRef.current) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    p.loadVideoById({ videoId, startSeconds: Math.floor(startSecondsRef.current) })
  }, [videoId])

  return <div ref={wrapperRef} data-testid="yt-player-container" className="h-full w-full" />
}
