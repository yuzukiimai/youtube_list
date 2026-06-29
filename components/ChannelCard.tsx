'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
  videoCount: number
  watchedCount: number
  inProgressCount: number
}

export function ChannelCard({
  channel,
  onDelete,
}: {
  channel: Channel
  onDelete: (channel: Channel) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const progress = channel.videoCount > 0
    ? Math.round((channel.watchedCount / channel.videoCount) * 100)
    : 0
  const unwatched = channel.videoCount - channel.watchedCount - channel.inProgressCount

  return (
    <div className="group relative">
      <Link
        href={`/channels/${channel.channelId}`}
        className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
      >
        <div className="mb-4 flex items-center gap-3">
          <Image
            src={channel.thumbnailUrl}
            alt={channel.name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full ring-1 ring-neutral-100"
          />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-red-600">
              {channel.name}
            </h2>
            <p className="mt-1 text-xs text-neutral-400">{channel.videoCount} 本の動画</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">視聴進捗</span>
          <span className="text-xs font-bold text-neutral-900">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />視聴済み {channel.watchedCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />中断 {channel.inProgressCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />未視聴 {unwatched}
          </span>
        </div>
      </Link>

      <button
        onClick={() => setConfirming(true)}
        aria-label="チャンネルを削除"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-neutral-400 opacity-0 shadow-sm ring-1 ring-neutral-200 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {confirming && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 px-4 text-center backdrop-blur-sm">
          <p className="text-sm font-medium text-neutral-800">このチャンネルを削除しますか？</p>
          <p className="-mt-1 text-xs text-neutral-500">視聴履歴もすべて削除されます</p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(channel); setConfirming(false) }}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              削除する
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
