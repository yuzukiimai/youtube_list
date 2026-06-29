import { memo } from 'react'
import { VideoCard } from './VideoCard'

interface Video {
  id: number
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  watched: boolean
  watchedAt: string | null
  progressSeconds: number
  duration: number | null
}

interface Props {
  videos: Video[]
  selectedId: number | null
  onSelect: (video: Video) => void
  onMarkWatched: (video: Video) => void
  onResetUnwatched: (video: Video) => void
}

// Memoized so that ticking the player's position (which updates `selected`,
// not this list) does NOT re-render 1000+ cards every frame.
export const VideoList = memo(function VideoList({
  videos, selectedId, onSelect, onMarkWatched, onResetUnwatched,
}: Props) {
  if (videos.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-neutral-400">該当する動画がありません</p>
      </div>
    )
  }
  return (
    <>
      {videos.map((v, i) => (
        <VideoCard
          key={v.id}
          video={v}
          isSelected={v.id === selectedId}
          onSelect={onSelect}
          onMarkWatched={onMarkWatched}
          onResetUnwatched={onResetUnwatched}
          priority={i === 0}
        />
      ))}
    </>
  )
})
