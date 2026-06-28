import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoCard } from './VideoCard'

const mockVideo = {
  id: 1,
  videoId: 'vid1',
  title: 'Test Video',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  publishedAt: '2024-01-15T00:00:00Z',
  watched: false,
  watchedAt: null,
  progressSeconds: 0,
  duration: null,
}

test('renders video title', () => {
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={() => {}} onToggleWatched={() => {}} />)
  expect(screen.getByText('Test Video')).toBeInTheDocument()
})

test('calls onSelect when card is clicked', async () => {
  const onSelect = vi.fn()
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={onSelect} onToggleWatched={() => {}} />)
  await userEvent.click(screen.getByText('Test Video'))
  expect(onSelect).toHaveBeenCalledWith(mockVideo)
})

test('shows watched badge when watched', () => {
  render(<VideoCard video={{ ...mockVideo, watched: true }} isSelected={false} onSelect={() => {}} onToggleWatched={() => {}} />)
  expect(screen.getByText('視聴済み')).toBeInTheDocument()
})
