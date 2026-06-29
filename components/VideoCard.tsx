import { memo } from 'react'
import Image from 'next/image'
import { StatusBadge } from './StatusBadge'
import { videoStatus, videoKind, formatSeconds } from '@/lib/videoStatus'

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
  video: Video
  isSelected: boolean
  onSelect: (video: Video) => void
  onMarkWatched: (video: Video) => void
  onResetUnwatched: (video: Video) => void
  priority?: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const VideoCard = memo(function VideoCard({ video, isSelected, onSelect, onMarkWatched, onResetUnwatched, priority }: Props) {
  const status = videoStatus(video)
  const progress = video.duration && video.duration > 0
    ? Math.min(100, Math.round((video.progressSeconds / video.duration) * 100))
    : 0
  const isInProgress = status === 'inProgress'
  const kind = videoKind(video.duration, video.title)

  return (
    <div
      onClick={() => onSelect(video)}
      className={`flex cursor-pointer gap-3 border-l-2 px-3 py-3 transition-colors ${
        isSelected
          ? 'border-l-red-500 bg-red-50/60'
          : 'border-l-transparent hover:bg-neutral-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <Image
          src={video.thumbnailUrl || '/placeholder.png'}
          alt={video.title}
          width={148}
          height={83}
          priority={priority}
          className={`h-[83px] w-[148px] rounded-lg object-cover ${video.watched ? 'opacity-60' : ''}`}
        />
        {video.watched && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/25">
            <svg className="h-8 w-8 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {video.duration != null && (
          <span className={`absolute bottom-1 right-1 rounded px-1 py-0.5 text-[10px] font-semibold leading-none text-white ${
            kind === 'short' ? 'bg-red-600/90' : 'bg-black/80'
          }`}>
            {kind === 'short' ? `⚡ ${formatSeconds(video.duration)}` : formatSeconds(video.duration)}
          </span>
        )}
        {isInProgress && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <p className={`line-clamp-2 text-sm font-medium leading-snug ${
            video.watched ? 'text-neutral-500' : 'text-neutral-900'
          }`}>
            {video.title}
          </p>
          <p className="mt-1 text-xs text-neutral-400">{formatDate(video.publishedAt)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusBadge
            status={isSelected && !video.watched ? 'playing' : status}
            suffix={
              ((isSelected && !video.watched) || isInProgress) && video.progressSeconds > 0
                ? formatSeconds(video.progressSeconds)
                : undefined
            }
          />
          <div className="flex flex-shrink-0 items-center gap-1">
            {status !== 'watched' && (
              <button
                onClick={e => { e.stopPropagation(); onMarkWatched(video) }}
                title="視聴済みにする"
                aria-label="視聴済みにする"
                className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-emerald-100 hover:text-emerald-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            {status !== 'unwatched' && (
              <button
                onClick={e => { e.stopPropagation(); onResetUnwatched(video) }}
                title="未視聴に戻す"
                aria-label="未視聴に戻す"
                className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
