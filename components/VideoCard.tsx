import Image from 'next/image'

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
  onToggleWatched: (video: Video) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function VideoCard({ video, isSelected, onSelect, onToggleWatched }: Props) {
  const progress = video.duration && video.duration > 0
    ? Math.round((video.progressSeconds / video.duration) * 100)
    : 0

  return (
    <div
      onClick={() => onSelect(video)}
      className={`flex gap-2 p-2 cursor-pointer hover:bg-gray-50 border-b ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <Image
          src={video.thumbnailUrl || '/placeholder.png'}
          alt={video.title}
          width={120}
          height={68}
          className="rounded object-cover"
        />
        {video.watched && (
          <span className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1 rounded">視聴済み</span>
        )}
        {!video.watched && video.progressSeconds > 0 && (
          <span className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-1 rounded">視聴中</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{video.title}</p>
        <p className="text-xs text-gray-500 mt-1">{formatDate(video.publishedAt)}</p>
        {video.progressSeconds > 0 && (
          <p className="text-xs text-gray-400">{formatSeconds(video.progressSeconds)} まで視聴</p>
        )}
        {video.duration && video.duration > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onToggleWatched(video) }}
          className={`mt-1 text-xs px-2 py-0.5 rounded ${
            video.watched
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {video.watched ? '✓ 観た' : '観た'}
        </button>
      </div>
    </div>
  )
}
