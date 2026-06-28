import { render, screen } from '@testing-library/react'
import { YoutubePlayer } from './YoutubePlayer'

// Mock YouTube IFrame API
vi.stubGlobal('YT', {
  Player: vi.fn().mockImplementation(function (this: unknown) {
    return {
      destroy: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(120),
      getDuration: vi.fn().mockReturnValue(600),
    }
  }),
  PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
})

test('renders a container div', () => {
  render(
    <YoutubePlayer
      videoId="vid1"
      startSeconds={0}
      onProgress={() => {}}
      onEnded={() => {}}
    />
  )
  expect(document.querySelector('[data-testid="yt-player-container"]')).toBeInTheDocument()
})
