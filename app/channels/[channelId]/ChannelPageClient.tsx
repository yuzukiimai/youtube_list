'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { VideoList } from '@/components/VideoList'
import { VideoFilter, Filter, Sort, KindFilter } from '@/components/VideoFilter'
import { StatusBadge } from '@/components/StatusBadge'
import { YoutubePlayer } from '@/components/YoutubePlayer'
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
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [selected, setSelected] = useState<Video | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [kind, setKind] = useState<KindFilter>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [keyword, setKeyword] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const selectedId = selected?.id ?? null
  // The currently-playing video is shown as "再生中", so it should not be
  // counted or filtered as "中断"/"未視聴".
  const isPlaying = (v: Video) => v.id === selectedId && !v.watched

  const counts = useMemo(() => {
    let watched = 0, inProgress = 0, unwatched = 0
    for (const v of videos) {
      if (isPlaying(v)) continue
      const s = videoStatus(v)
      if (s === 'watched') watched++
      else if (s === 'inProgress') inProgress++
      else unwatched++
    }
    return { all: videos.length, watched, inProgress, unwatched }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, selectedId])

  const filteredVideos = useMemo(() => {
    const list = videos
      // The playing video always stays visible (so it doesn't vanish from the
      // status filter the moment you select it), but counts as "再生中".
      .filter(v => isPlaying(v) || filter === 'all' || videoStatus(v) === filter)
      .filter(v => kind === 'all' || videoKind(v.duration, v.title) === kind)
      .filter(v => !keyword || v.title.toLowerCase().includes(keyword.toLowerCase()))

    const sorted = [...list]
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
        break
      case 'oldest':
        sorted.sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt))
        break
      case 'longest':
        sorted.sort((a, b) => (b.duration ?? -1) - (a.duration ?? -1))
        break
      case 'shortest':
        sorted.sort((a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity))
        break
    }
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, filter, kind, keyword, sort, selectedId])

  const lastSaveAtRef = useRef(0)
  const handleProgress = useCallback(async (seconds: number, duration: number) => {
    if (!selected) return
    const secs = Math.floor(seconds)

    // Smooth UI: update the playing video's position every tick (~1s).
    setSelected(s => (s && s.id === selected.id) ? { ...s, progressSeconds: secs } : s)

    // Persist to the DB at most once every 5s (avoids excessive writes).
    if (Date.now() - lastSaveAtRef.current < 5000) return
    lastSaveAtRef.current = Date.now()

    const res = await fetch(`/api/videos/${selected.id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressSeconds: secs, duration: Math.floor(duration) }),
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
    setSelected(s => s ? { ...s, watched: true } : s)
  }, [selected])

  const handleMarkWatched = useCallback(async (video: Video) => {
    const res = await fetch(`/api/videos/${video.id}/watched`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched: true }),
    })
    if (!res.ok) return
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, watched: true } : v))
    setSelected(s => (s && s.id === video.id) ? { ...s, watched: true } : s)
  }, [])

  // Reset back to 未視聴: clears both watched and playback progress.
  const handleResetUnwatched = useCallback(async (video: Video) => {
    const res = await fetch(`/api/videos/${video.id}/watched`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched: false }),
    })
    if (!res.ok) return
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, watched: false, progressSeconds: 0 } : v))
    setSelected(s => (s && s.id === video.id) ? { ...s, watched: false, progressSeconds: 0 } : s)
  }, [])

  const runSync = useCallback(async () => {
    setSyncing(true)
    try {
      const syncRes = await fetch(`/api/channels/${channel.id}/sync`, { method: 'POST' })
      if (!syncRes.ok) console.error('Sync failed:', await syncRes.text())
      const res = await fetch(`/api/channels/${channel.id}/videos`)
      if (res.ok) setVideos(await res.json())
    } finally {
      setSyncing(false)
    }
  }, [channel.id])

  // Auto-update when the channel page is opened (picks up new uploads and fills
  // in missing durations). Runs once per mount in the background.
  const autoSynced = useRef(false)
  useEffect(() => {
    if (autoSynced.current) return
    autoSynced.current = true
    runSync()
  }, [runSync])

  const handleDeleteChannel = async () => {
    const res = await fetch(`/api/channels/${channel.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/')
  }

  const progressPct = videos.length > 0 ? Math.round((counts.watched / videos.length) * 100) : 0

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left: video list */}
      <aside className={`flex flex-shrink-0 flex-col border-r border-neutral-200 ${sidebarOpen ? 'w-[440px]' : 'hidden'}`}>
        {/* Channel header */}
        <div className="border-b border-neutral-200 px-4 py-3">
          <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            チャンネル一覧
          </Link>

          <div className="flex items-center gap-3">
            <Image
              src={channel.thumbnailUrl}
              alt={channel.name}
              width={44}
              height={44}
              className="h-11 w-11 rounded-full ring-1 ring-neutral-100"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold text-neutral-900">{channel.name}</h1>
              <p className="text-xs text-neutral-400">{videos.length} 本の動画</p>
            </div>
            <button
              onClick={runSync}
              disabled={syncing}
              title="新着動画を取得"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              title="チャンネルを削除"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-semibold text-neutral-600">{progressPct}%</span>
          </div>
        </div>

        <VideoFilter
          filter={filter}
          keyword={keyword}
          onFilterChange={setFilter}
          onKeywordChange={setKeyword}
          counts={counts}
          kind={kind}
          onKindChange={setKind}
          sort={sort}
          onSortChange={setSort}
          syncing={syncing}
        />

        <div className="scroll-slim flex-1 overflow-y-auto divide-y divide-neutral-100">
          <VideoList
            videos={filteredVideos}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onMarkWatched={handleMarkWatched}
            onResetUnwatched={handleResetUnwatched}
          />
        </div>
      </aside>

      {/* Right: player */}
      <main className="flex flex-1 flex-col overflow-hidden bg-neutral-950">
        {selected ? (
          <>
            {/* Player fills all available space while keeping 16:9 and never overflowing.
                Height-driven sizing guarantees it never spills past the bottom. */}
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
              <div className="aspect-video h-full max-h-full max-w-full">
                <YoutubePlayer
                  videoId={selected.videoId}
                  startSeconds={selected.progressSeconds}
                  onProgress={handleProgress}
                  onEnded={handleEnded}
                />
              </div>
            </div>

            {/* Compact info bar */}
            <div className="flex h-14 flex-shrink-0 items-center gap-3 border-t border-neutral-800 bg-white px-4">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                title={sidebarOpen ? '一覧を隠して動画を大きく' : '動画一覧を表示'}
                className="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                {sidebarOpen ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                    </svg>
                    拡大
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                    縮小
                  </>
                )}
              </button>
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900" title={selected.title}>
                {selected.title}
              </h2>
              <StatusBadge
                status={selected.watched ? 'watched' : 'playing'}
                suffix={!selected.watched && selected.progressSeconds > 0 ? formatSeconds(selected.progressSeconds) : undefined}
              />
              {videoStatus(selected) !== 'unwatched' && (
                <button
                  onClick={() => handleResetUnwatched(selected)}
                  className="flex-shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                >
                  未視聴に戻す
                </button>
              )}
              {videoStatus(selected) !== 'watched' && (
                <button
                  onClick={() => handleMarkWatched(selected)}
                  className="flex-shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                >
                  視聴済みにする
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-neutral-500">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mb-6 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                動画一覧を表示
              </button>
            )}
            <svg className="mb-4 h-16 w-16 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-neutral-400">左の一覧から動画を選んで再生</p>
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmingDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-neutral-900">チャンネルを削除しますか？</h3>
            <p className="mt-2 text-sm text-neutral-500">
              「{channel.name}」と {videos.length} 本の動画の視聴履歴がすべて削除されます。この操作は取り消せません。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteChannel}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
