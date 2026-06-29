import { resolveChannelFromInput, searchChannels, fetchAllVideos, fetchVideoDurations, parseDuration } from './youtube'

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

const mockSearchResponse = {
  items: [
    {
      id: { channelId: 'UCsearch1' },
      snippet: {
        title: 'Found Channel',
        description: 'A nice channel',
        thumbnails: { default: { url: 'https://example.com/s1.jpg' } },
      },
    },
  ],
}

beforeEach(() => {
  global.fetch = vi.fn()
})

function mockFetchOnce(json: unknown) {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => json } as Response)
}

test('resolveChannelFromInput resolves @handle URL', async () => {
  mockFetchOnce(mockChannelResponse)
  const result = await resolveChannelFromInput('https://www.youtube.com/@testchannel')
  expect(result.channelId).toBe('UCtest123')
  expect(result.name).toBe('Test Channel')
  expect(result.uploadsPlaylistId).toBe('UUtest123')
})

test('resolveChannelFromInput resolves /channel/ID URL', async () => {
  mockFetchOnce(mockChannelResponse)
  const result = await resolveChannelFromInput('https://www.youtube.com/channel/UCtest123')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromInput resolves a bare @handle', async () => {
  mockFetchOnce(mockChannelResponse)
  const result = await resolveChannelFromInput('@testchannel')
  const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
  expect(calledUrl).toContain('forHandle=testchannel')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromInput resolves a raw channel ID', async () => {
  mockFetchOnce(mockChannelResponse)
  const result = await resolveChannelFromInput('UCabcdefghijklmnopqrstuv')
  const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
  expect(calledUrl).toContain('id=UCabcdefghijklmnopqrstuv')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromInput resolves a video watch URL via its channel', async () => {
  // first call: videos endpoint
  mockFetchOnce({ items: [{ snippet: { channelId: 'UCtest123' } }] })
  // second call: channels endpoint
  mockFetchOnce(mockChannelResponse)

  const result = await resolveChannelFromInput('https://www.youtube.com/watch?v=abc123')
  expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/videos?')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromInput resolves a youtu.be short link', async () => {
  mockFetchOnce({ items: [{ snippet: { channelId: 'UCtest123' } }] })
  mockFetchOnce(mockChannelResponse)

  const result = await resolveChannelFromInput('https://youtu.be/abc123')
  expect(vi.mocked(fetch).mock.calls[0][0]).toContain('id=abc123')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromInput throws for non-YouTube URL', async () => {
  await expect(resolveChannelFromInput('https://example.com/foo/bar')).rejects.toThrow('YouTube')
})

test('resolveChannelFromInput throws when channel not found', async () => {
  mockFetchOnce({ items: [] })
  await expect(resolveChannelFromInput('https://www.youtube.com/@nobody')).rejects.toThrow('見つかりませんでした')
})

test('searchChannels returns candidates', async () => {
  mockFetchOnce(mockSearchResponse)
  const results = await searchChannels('found')
  expect(results).toHaveLength(1)
  expect(results[0].channelId).toBe('UCsearch1')
  expect(results[0].name).toBe('Found Channel')
  expect(results[0].description).toBe('A nice channel')
})

test('searchChannels returns empty array for blank query', async () => {
  const results = await searchChannels('   ')
  expect(results).toEqual([])
  expect(fetch).not.toHaveBeenCalled()
})

test('fetchAllVideos returns videos and skips private ones', async () => {
  mockFetchOnce(mockPlaylistResponse)
  const videos = await fetchAllVideos('UUtest123')
  expect(videos).toHaveLength(1)
  expect(videos[0].videoId).toBe('vid1')
  expect(videos[0].title).toBe('Video One')
})

test('fetchAllVideos stops at the first known video when knownIds given', async () => {
  mockFetchOnce({
    items: [
      { snippet: { resourceId: { kind: 'youtube#video', videoId: 'new1' }, title: 'New', thumbnails: {}, publishedAt: '2024-06-01T00:00:00Z' } },
      { snippet: { resourceId: { kind: 'youtube#video', videoId: 'old1' }, title: 'Old', thumbnails: {}, publishedAt: '2024-01-01T00:00:00Z' } },
    ],
    nextPageToken: 'PAGE2',
  })
  const videos = await fetchAllVideos('UUtest123', { knownIds: new Set(['old1']) })
  expect(videos.map(v => v.videoId)).toEqual(['new1'])
  // Should have stopped before fetching page 2
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('parseDuration converts ISO 8601 to seconds', () => {
  expect(parseDuration('PT45S')).toBe(45)
  expect(parseDuration('PT1M30S')).toBe(90)
  expect(parseDuration('PT1H2M3S')).toBe(3723)
})

test('fetchVideoDurations maps ids to seconds', async () => {
  mockFetchOnce({
    items: [
      { id: 'a', contentDetails: { duration: 'PT30S' } },
      { id: 'b', contentDetails: { duration: 'PT12M' } },
    ],
  })
  const result = await fetchVideoDurations(['a', 'b'])
  expect(result).toEqual({ a: 30, b: 720 })
})
