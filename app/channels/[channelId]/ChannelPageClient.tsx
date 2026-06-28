'use client'

import { useState, useMemo, useCallback } from 'react'
import { VideoCard } from '@/components/VideoCard'
import { VideoFilter } from '@/components/VideoFilter'
import { YoutubePlayer } from '@/components/YoutubePlayer'
import Image from 'next/image'

type Filter = 'all' | 'watched' | 'unwatched'

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

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
}

interface Props {
  channel: Channel
  initialVideos: Video[]
}

export function ChannelPageClient({ channel, initialVideos }: Props) {
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [selected, setSelected] = useState<Video | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [keyword, setKeyword] = useState('')
  const [syncing, setSyncing] = useState(false)

  const filteredVideos = useMemo(() => {
    return videos
      .filter(v => {
        if (filter === 'watched') return v.watched
        if (filter === 'unwatched') return !v.watched
        return true
      })
      .filter(v => !keyword || v.title.toLowerCase().includes(keyword.toLowerCase()))
  }, [videos, filter, keyword])

  const handleProgress = useCallback(async (seconds: number, duration: number) => {
    if (!selected) return
    const res = await fetch(`/api/videos/${selected.id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressSeconds: Math.floor(seconds), duration: Math.floor(duration) }),
    })
    if (!res.ok) return
    const data = await res.json()
    setVideos(prev => prev.map(v =>
      v.id === selected.id
        ? { ...v, progressSeconds: data.progressSeconds, watched: data.watched }
        : v
    ))
    if (data.watched && !selected.watched) {
      setSelected(s => s ? { ...s, watched: true } : s)
    }
  }, [selected])

  const handleEnded = useCallback(async () => {
    if (!selected) return
    const res = await fetch(`/api/videos/${selected.id}/watched`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched: true }),
    })
    if (!res.ok) return
    setVideos(prev => prev.map(v => v.id === selected.id ? { ...v, watched: true } : v))
  }, [selected])

  const handleToggleWatched = useCallback(async (video: Video) => {
    const next = !video.watched
    const res = await fetch(`/api/videos/${video.id}/watched`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched: next }),
    })
    if (!res.ok) return
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, watched: next } : v))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch(`/api/channels/${channel.id}/sync`, { method: 'POST' })
      const res = await fetch(`/api/channels/${channel.id}/videos`)
      if (res.ok) setVideos(await res.json())
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: video list */}
      <div className="w-2/5 flex flex-col border-r">
        <div className="flex items-center gap-3 p-3 border-b">
          <Image src={channel.thumbnailUrl} alt={channel.name} width={40} height={40} className="rounded-full" />
          <h1 className="font-bold text-gray-900 flex-1 truncate">{channel.name}</h1>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {syncing ? '更新中...' : '更新'}
          </button>
        </div>
        <VideoFilter filter={filter} keyword={keyword} onFilterChange={setFilter} onKeywordChange={setKeyword} />
        <div className="flex-1 overflow-y-auto">
          {filteredVideos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">動画がありません</p>
          ) : (
            filteredVideos.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                isSelected={selected?.id === v.id}
                onSelect={setSelected}
                onToggleWatched={handleToggleWatched}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: player */}
      <div className="w-3/5 flex flex-col">
        {selected ? (
          <>
            <div className="aspect-video w-full bg-black">
              <YoutubePlayer
                key={selected.videoId}
                videoId={selected.videoId}
                startSeconds={selected.progressSeconds}
                onProgress={handleProgress}
                onEnded={handleEnded}
              />
            </div>
            <div className="p-4">
              <h2 className="font-semibold text-gray-900">{selected.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(selected.publishedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            左の一覧から動画を選んでください
          </div>
        )}
      </div>
    </div>
  )
}
