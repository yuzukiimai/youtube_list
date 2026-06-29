'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChannelCard } from '@/components/ChannelCard'
import { RegisterChannelForm } from '@/components/RegisterChannelForm'

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
  videoCount: number
  watchedCount: number
  inProgressCount: number
}

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadChannels = useCallback(async () => {
    const res = await fetch('/api/channels')
    if (res.ok) setChannels(await res.json())
    setLoaded(true)
  }, [])

  useEffect(() => { loadChannels() }, [loadChannels])

  const handleDelete = useCallback(async (channel: Channel) => {
    const res = await fetch(`/api/channels/${channel.id}`, { method: 'DELETE' })
    if (res.ok) setChannels(prev => prev.filter(c => c.id !== channel.id))
  }, [])

  const totalVideos = channels.reduce((a, c) => a + c.videoCount, 0)
  const totalWatched = channels.reduce((a, c) => a + c.watchedCount, 0)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 shadow-sm">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-none text-neutral-900">Watch Tracker</h1>
            <p className="mt-1 text-xs text-neutral-500">YouTube チャンネルの視聴管理</p>
          </div>
          {channels.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900">{totalWatched} / {totalVideos}</p>
              <p className="text-xs text-neutral-500">視聴済み</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <h2 className="text-sm font-semibold text-neutral-700">チャンネルを追加</h2>
          </div>
          <RegisterChannelForm onRegistered={loadChannels} />
        </section>

        {!loaded ? null : channels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <svg className="h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="font-medium text-neutral-700">チャンネルが未登録です</p>
            <p className="mt-1 text-sm text-neutral-400">上のフォームに YouTube チャンネルの URL を入力してください</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700">登録チャンネル</h2>
              <span className="text-xs text-neutral-400">{channels.length} 件</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map(ch => (
                <ChannelCard key={ch.id} channel={ch} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
