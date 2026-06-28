import Link from 'next/link'
import Image from 'next/image'

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
  videoCount: number
  watchedCount: number
}

export function ChannelCard({ channel }: { channel: Channel }) {
  const progress = channel.videoCount > 0
    ? Math.round((channel.watchedCount / channel.videoCount) * 100)
    : 0

  return (
    <Link href={`/channels/${channel.channelId}`} className="block rounded-lg border p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={channel.thumbnailUrl}
          alt={channel.name}
          width={48}
          height={48}
          className="rounded-full"
        />
        <h2 className="font-semibold text-gray-900 line-clamp-2">{channel.name}</h2>
      </div>
      <div className="text-sm text-gray-500 mb-2">
        <span>{channel.watchedCount} / {channel.videoCount}</span> 視聴済み
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  )
}
