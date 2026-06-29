import type { ReactNode } from 'react'

export type Filter = 'all' | 'unwatched' | 'inProgress' | 'watched'
export type Sort = 'newest' | 'oldest' | 'longest' | 'shortest'
export type KindFilter = 'all' | 'short' | 'long'

interface Props {
  filter: Filter
  keyword: string
  onFilterChange: (f: Filter) => void
  onKeywordChange: (k: string) => void
  counts: { all: number; unwatched: number; inProgress: number; watched: number }
  kind: KindFilter
  onKindChange: (k: KindFilter) => void
  sort: Sort
  onSortChange: (s: Sort) => void
  syncing: boolean
}

const STATUS_DOT: Record<Filter, string> = {
  all: 'bg-neutral-400',
  unwatched: 'bg-neutral-400',
  inProgress: 'bg-amber-500',
  watched: 'bg-emerald-500',
}

export function VideoFilter({
  filter, keyword, onFilterChange, onKeywordChange, counts,
  kind, onKindChange, sort, onSortChange, syncing,
}: Props) {
  const statusButtons: { label: string; value: Filter }[] = [
    { label: 'すべて', value: 'all' },
    { label: '未視聴', value: 'unwatched' },
    { label: '中断', value: 'inProgress' },
    { label: '視聴済み', value: 'watched' },
  ]

  // Toggle chips — clicking the active one clears back to "all".
  // Icons evoke a phone held vertically (Short) vs horizontally (横動画).
  const kindButtons: { label: string; value: Exclude<KindFilter, 'all'>; icon: ReactNode }[] = [
    {
      label: 'ショート',
      value: 'short',
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" strokeWidth={1.8} />
          <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: '横動画',
      value: 'long',
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="2.5" y="7" width="19" height="10" rx="2.5" strokeWidth={1.8} />
          <line x1="18.5" y1="10.5" x2="18.5" y2="13.5" strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-2 border-b border-neutral-200 bg-white px-3 py-3">
      {/* Row 1: status */}
      <div className="flex flex-wrap gap-1.5">
        {statusButtons.map(b => {
          const active = filter === b.value
          return (
            <button
              key={b.value}
              onClick={() => onFilterChange(b.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {b.value !== 'all' && (
                <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white/70' : STATUS_DOT[b.value]}`} />
              )}
              {b.label}
              <span className={active ? 'text-white/60' : 'text-neutral-400'}>{counts[b.value]}</span>
            </button>
          )
        })}
      </div>

      {/* Row 2: kind (left-aligned, same start as row 1) */}
      <div className="flex flex-wrap gap-1.5">
        {kindButtons.map(b => {
          const active = kind === b.value
          return (
            <button
              key={b.value}
              onClick={() => onKindChange(active ? 'all' : b.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span aria-hidden>{b.icon}</span>
              {b.label}
            </button>
          )
        })}
      </div>

      {/* Row 3: search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={e => onKeywordChange(e.target.value)}
            placeholder="タイトルで検索..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as Sort)}
          className="flex-shrink-0 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
          <option value="longest">長い順</option>
          <option value="shortest">短い順</option>
        </select>
      </div>

      {syncing && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          最新の動画を確認中…
        </p>
      )}
    </div>
  )
}
