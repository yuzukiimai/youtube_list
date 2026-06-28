type Filter = 'all' | 'watched' | 'unwatched'

interface Props {
  filter: Filter
  keyword: string
  onFilterChange: (f: Filter) => void
  onKeywordChange: (k: string) => void
}

export function VideoFilter({ filter, keyword, onFilterChange, onKeywordChange }: Props) {
  const buttons: { label: string; value: Filter }[] = [
    { label: 'すべて', value: 'all' },
    { label: '未視聴', value: 'unwatched' },
    { label: '視聴済み', value: 'watched' },
  ]

  return (
    <div className="flex gap-2 items-center p-3 border-b">
      <div className="flex gap-1">
        {buttons.map(b => (
          <button
            key={b.value}
            onClick={() => onFilterChange(b.value)}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === b.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={keyword}
        onChange={e => onKeywordChange(e.target.value)}
        placeholder="タイトルで検索..."
        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
