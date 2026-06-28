import { GET } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    video: { findMany: vi.fn() },
  },
}))

const mockVideo = {
  id: 1,
  videoId: 'vid1',
  channelId: 1,
  title: 'Video 1',
  thumbnailUrl: 'https://example.com/v1.jpg',
  duration: 600,
  publishedAt: new Date('2024-01-15'),
  watched: false,
  watchedAt: null,
  progressSeconds: 0,
}

test('GET returns videos for a channel', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({ id: 1 } as any)
  vi.mocked(prisma.video.findMany).mockResolvedValue([mockVideo])

  const req = new Request('http://localhost/api/channels/1/videos')
  const res = await GET(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toHaveLength(1)
  expect(data[0].videoId).toBe('vid1')
})

test('GET returns 404 for unknown channel', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(null)

  const req = new Request('http://localhost/api/channels/999/videos')
  const res = await GET(req, { params: Promise.resolve({ id: '999' }) })
  expect(res.status).toBe(404)
})
