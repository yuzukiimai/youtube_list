import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelCard } from './ChannelCard'

const mockChannel = {
  id: 1,
  channelId: 'UCtest',
  name: 'Test Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  videoCount: 42,
  watchedCount: 10,
  inProgressCount: 5,
}

test('renders channel name', () => {
  render(<ChannelCard channel={mockChannel} onDelete={() => {}} />)
  expect(screen.getByText('Test Channel')).toBeInTheDocument()
})

test('renders video count and progress percentage', () => {
  render(<ChannelCard channel={mockChannel} onDelete={() => {}} />)
  expect(screen.getByText('42 本の動画')).toBeInTheDocument()
  // 10 / 42 ≈ 24%
  expect(screen.getByText('24%')).toBeInTheDocument()
})

test('asks for confirmation then calls onDelete', async () => {
  const onDelete = vi.fn()
  render(<ChannelCard channel={mockChannel} onDelete={onDelete} />)
  await userEvent.click(screen.getByRole('button', { name: 'チャンネルを削除' }))
  await userEvent.click(screen.getByRole('button', { name: '削除する' }))
  expect(onDelete).toHaveBeenCalledWith(mockChannel)
})
