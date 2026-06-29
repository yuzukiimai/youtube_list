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

const noop = () => {}

test('renders video title', () => {
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={noop} onMarkWatched={noop} onResetUnwatched={noop} />)
  expect(screen.getByText('Test Video')).toBeInTheDocument()
})

test('calls onSelect when card is clicked', async () => {
  const onSelect = vi.fn()
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={onSelect} onMarkWatched={noop} onResetUnwatched={noop} />)
  await userEvent.click(screen.getByText('Test Video'))
  expect(onSelect).toHaveBeenCalledWith(mockVideo)
})

test('shows watched badge when watched', () => {
  render(<VideoCard video={{ ...mockVideo, watched: true }} isSelected={false} onSelect={noop} onMarkWatched={noop} onResetUnwatched={noop} />)
  expect(screen.getByText('視聴済み')).toBeInTheDocument()
})

test('shows in-progress badge when partially watched', () => {
  render(
    <VideoCard
      video={{ ...mockVideo, watched: false, progressSeconds: 65, duration: 200 }}
      isSelected={false}
      onSelect={noop}
      onMarkWatched={noop}
      onResetUnwatched={noop}
    />
  )
  expect(screen.getByText(/中断/)).toBeInTheDocument()
})

test('unwatched video shows only the mark-watched action', () => {
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={noop} onMarkWatched={noop} onResetUnwatched={noop} />)
  expect(screen.getByRole('button', { name: '視聴済みにする' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '未視聴に戻す' })).not.toBeInTheDocument()
})

test('in-progress video shows both mark-watched and reset actions', async () => {
  const onMarkWatched = vi.fn()
  const onResetUnwatched = vi.fn()
  const v = { ...mockVideo, progressSeconds: 65, duration: 200 }
  render(<VideoCard video={v} isSelected={false} onSelect={noop} onMarkWatched={onMarkWatched} onResetUnwatched={onResetUnwatched} />)
  await userEvent.click(screen.getByRole('button', { name: '未視聴に戻す' }))
  expect(onResetUnwatched).toHaveBeenCalledWith(v)
  expect(screen.getByRole('button', { name: '視聴済みにする' })).toBeInTheDocument()
})

test('watched video shows only the reset action', () => {
  render(<VideoCard video={{ ...mockVideo, watched: true }} isSelected={false} onSelect={noop} onMarkWatched={noop} onResetUnwatched={noop} />)
  expect(screen.getByRole('button', { name: '未視聴に戻す' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '視聴済みにする' })).not.toBeInTheDocument()
})
