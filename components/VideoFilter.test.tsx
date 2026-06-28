import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoFilter } from './VideoFilter'

test('renders filter buttons and search input', () => {
  render(<VideoFilter filter="all" keyword="" onFilterChange={() => {}} onKeywordChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '未視聴' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '視聴済み' })).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/タイトルで検索/i)).toBeInTheDocument()
})

test('calls onFilterChange when button is clicked', async () => {
  const onFilterChange = vi.fn()
  render(<VideoFilter filter="all" keyword="" onFilterChange={onFilterChange} onKeywordChange={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: '未視聴' }))
  expect(onFilterChange).toHaveBeenCalledWith('unwatched')
})
