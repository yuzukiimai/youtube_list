'use client'

import { useState } from 'react'

interface Candidate {
  channelId: string
  name: string
  thumbnailUrl: string
  description: string
}

// Looks like something we can resolve directly (URL, @handle, or channel ID)
function isDirectInput(v: string): boolean {
  return (
    v.startsWith('@') ||
    v.startsWith('http') ||
    v.includes('youtube.com') ||
    v.includes('youtu.be') ||
    /^UC[\w-]{22}$/.test(v)
  )
}

export function RegisterChannelForm({ onRegistered }: { onRegistered: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  async function addChannel(input: string): Promise<boolean> {
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })
    if (res.ok) return true
    const data = await res.json().catch(() => ({}))
    if (res.status === 409) setError('そのチャンネルは登録済みです')
    else setError(data.error ?? '登録に失敗しました')
    return false
  }

  async function runSearch(query: string) {
    setSearching(true)
    setCandidates(null)
    try {
      const res = await fetch(`/api/channels/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '検索に失敗しました')
        return
      }
      if (!Array.isArray(data) || data.length === 0) {
        setError('該当するチャンネルが見つかりませんでした')
        return
      }
      setCandidates(data)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setSearching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = value.trim()
    if (!input) {
      setError('チャンネル名または URL を入力してください')
      return
    }
    setError('')
    setCandidates(null)

    if (isDirectInput(input)) {
      setSubmitting(true)
      try {
        if (await addChannel(input)) {
          setValue('')
          onRegistered()
        }
      } finally {
        setSubmitting(false)
      }
    } else {
      // Plain text → treat as a name search
      await runSearch(input)
    }
  }

  async function handleAddCandidate(c: Candidate) {
    setError('')
    setAddingId(c.channelId)
    try {
      if (await addChannel(c.channelId)) {
        setValue('')
        setCandidates(null)
        onRegistered()
      }
    } finally {
      setAddingId(null)
    }
  }

  const busy = submitting || searching
  // URL/@handle/ID は直接追加、それ以外の名前は検索 — ラベルを実態に合わせる。
  const submitLabel = isDirectInput(value.trim()) ? '追加' : '検索'

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="チャンネル名・URL・@ハンドル・動画URL いずれでもOK"
          className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {searching ? '検索中' : '登録中'}
            </>
          ) : submitLabel}
        </button>
      </form>

      <p className="mt-2 text-xs text-neutral-400">
        名前を入れると検索します。URL や @ハンドルならそのまま追加します。
      </p>

      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {candidates && candidates.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-neutral-500">検索結果から選択</p>
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
            {candidates.map(c => (
              <div key={c.channelId} className="flex items-center gap-3 bg-white px-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumbnailUrl}
                  alt={c.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 flex-shrink-0 rounded-full ring-1 ring-neutral-100"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{c.name}</p>
                  {c.description && (
                    <p className="truncate text-xs text-neutral-400">{c.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAddCandidate(c)}
                  disabled={addingId !== null}
                  className="flex-shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                  {addingId === c.channelId ? '追加中…' : '追加'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
