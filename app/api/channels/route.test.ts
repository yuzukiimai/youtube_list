import { POST, GET } from './route'
import { prisma } from '@/lib/prisma'
import * as youtube from '@/lib/youtube'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    video: {
      createMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/youtube')

const mockChannel = {
  id: 1,
  channelId: 'UCtest123',
  name: 'Test Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  uploadsPlaylistId: 'UUtest123',
  registeredAt: new Date(),
}

test('POST /api/channels registers a channel and fetches videos', async () => {
  vi.mocked(youtube.resolveChannelFromInput).mockResolvedValue({
    channelId: 'UCtest123',
    name: 'Test Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    uploadsPlaylistId: 'UUtest123',
  })
  vi.mocked(youtube.fetchAllVideos).mockResolvedValue([
    { videoId: 'v1', title: 'Video 1', thumbnailUrl: 'https://example.com/v1.jpg', publishedAt: '2024-01-01T00:00:00Z' },
  ])
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.channel.create).mockResolvedValue(mockChannel)
  vi.mocked(prisma.video.createMany).mockResolvedValue({ count: 1 })

  const req = new Request('http://localhost/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.youtube.com/@testchannel' }),
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.channelId).toBe('UCtest123')
  expect(data.videoCount).toBe(1)
})

test('POST /api/channels returns 400 for missing URL', async () => {
  const req = new Request('http://localhost/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})

test('POST /api/channels returns 409 if channel already registered', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(mockChannel)

  const req = new Request('http://localhost/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.youtube.com/@testchannel' }),
  })

  vi.mocked(youtube.resolveChannelFromInput).mockResolvedValue({
    channelId: 'UCtest123',
    name: 'Test Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    uploadsPlaylistId: 'UUtest123',
  })

  const res = await POST(req)
  expect(res.status).toBe(409)
})

test('GET /api/channels returns channel list with counts', async () => {
  vi.mocked(prisma.channel.findMany).mockResolvedValue([
    { ...mockChannel, videos: [{ watched: true }, { watched: false }] } as any,
  ])

  const req = new Request('http://localhost/api/channels')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data[0].videoCount).toBe(2)
  expect(data[0].watchedCount).toBe(1)
})
