import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoFilter } from './VideoFilter'

const defaultProps = {
  filter: 'all' as const,
  keyword: '',
  onFilterChange: () => {},
  onKeywordChange: () => {},
  counts: { all: 10, unwatched: 4, inProgress: 3, watched: 3 },
  kind: 'all' as const,
  onKindChange: () => {},
  kindCounts: { all: 10, short: 4, long: 6 },
  sort: 'newest' as const,
  onSortChange: () => {},
  syncing: false,
}

test('renders status, kind filters and search input', () => {
  render(<VideoFilter {...defaultProps} />)
  expect(screen.getByRole('button', { name: /未視聴/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /中断/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /ショート/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /横動画/ })).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/タイトルで検索/i)).toBeInTheDocument()
})

test('calls onFilterChange with inProgress when 中断 clicked', async () => {
  const onFilterChange = vi.fn()
  render(<VideoFilter {...defaultProps} onFilterChange={onFilterChange} />)
  await userEvent.click(screen.getByRole('button', { name: /中断/ }))
  expect(onFilterChange).toHaveBeenCalledWith('inProgress')
})

test('calls onKindChange with short when ショート clicked', async () => {
  const onKindChange = vi.fn()
  render(<VideoFilter {...defaultProps} onKindChange={onKindChange} />)
  await userEvent.click(screen.getByRole('button', { name: /ショート/ }))
  expect(onKindChange).toHaveBeenCalledWith('short')
})

test('calls onSortChange when sort option changes', async () => {
  const onSortChange = vi.fn()
  render(<VideoFilter {...defaultProps} onSortChange={onSortChange} />)
  await userEvent.selectOptions(screen.getByRole('combobox'), 'oldest')
  expect(onSortChange).toHaveBeenCalledWith('oldest')
})
