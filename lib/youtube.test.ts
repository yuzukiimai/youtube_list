import { resolveChannelFromUrl, fetchAllVideos } from './youtube'

const mockChannelResponse = {
  items: [{
    id: 'UCtest123',
    snippet: {
      title: 'Test Channel',
      thumbnails: { default: { url: 'https://example.com/thumb.jpg' } },
    },
    contentDetails: {
      relatedPlaylists: { uploads: 'UUtest123' },
    },
  }],
}

const mockPlaylistResponse = {
  items: [
    {
      snippet: {
        resourceId: { kind: 'youtube#video', videoId: 'vid1' },
        title: 'Video One',
        thumbnails: { medium: { url: 'https://example.com/v1.jpg' } },
        publishedAt: '2024-01-15T10:00:00Z',
      },
    },
    {
      snippet: {
        resourceId: { kind: 'youtube#video', videoId: 'vid2' },
        title: 'Private video',
        thumbnails: {},
        publishedAt: '2024-01-10T10:00:00Z',
      },
    },
  ],
  nextPageToken: undefined,
}

beforeEach(() => {
  global.fetch = vi.fn()
})

test('resolveChannelFromUrl resolves @handle URL', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockChannelResponse,
  } as Response)

  const result = await resolveChannelFromUrl('https://www.youtube.com/@testchannel')
  expect(result.channelId).toBe('UCtest123')
  expect(result.name).toBe('Test Channel')
  expect(result.uploadsPlaylistId).toBe('UUtest123')
})

test('resolveChannelFromUrl resolves /channel/ID URL', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockChannelResponse,
  } as Response)

  const result = await resolveChannelFromUrl('https://www.youtube.com/channel/UCtest123')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromUrl throws for non-YouTube URL', async () => {
  await expect(resolveChannelFromUrl('https://example.com/test')).rejects.toThrow('Not a YouTube URL')
})

test('resolveChannelFromUrl throws when channel not found', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [] }),
  } as Response)

  await expect(resolveChannelFromUrl('https://www.youtube.com/@nobody')).rejects.toThrow('Channel not found')
})

test('fetchAllVideos returns videos and skips private ones', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockPlaylistResponse,
  } as Response)

  const videos = await fetchAllVideos('UUtest123')
  expect(videos).toHaveLength(1)
  expect(videos[0].videoId).toBe('vid1')
  expect(videos[0].title).toBe('Video One')
})
