import { render, screen } from '@testing-library/react'
import { ChannelCard } from './ChannelCard'

const mockChannel = {
  id: 1,
  channelId: 'UCtest',
  name: 'Test Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  videoCount: 42,
  watchedCount: 10,
}

test('renders channel name', () => {
  render(<ChannelCard channel={mockChannel} />)
  expect(screen.getByText('Test Channel')).toBeInTheDocument()
})

test('renders video and watched counts', () => {
  render(<ChannelCard channel={mockChannel} />)
  expect(screen.getByText('10 / 42')).toBeInTheDocument()
})
