import { POST } from './route'
import { prisma } from '@/lib/prisma'
import * as youtube from '@/lib/youtube'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    video: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/youtube')

test('POST /sync fetches new videos and returns added count', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({
    id: 1,
    channelId: 'UCtest',
    uploadsPlaylistId: 'UUtest',
  } as any)
  vi.mocked(prisma.video.findFirst).mockResolvedValue({
    publishedAt: new Date('2024-01-01'),
  } as any)
  vi.mocked(youtube.fetchAllVideos).mockResolvedValue([
    { videoId: 'new1', title: 'New Video', thumbnailUrl: '', publishedAt: '2024-06-01T00:00:00Z' },
  ])
  vi.mocked(prisma.video.createMany).mockResolvedValue({ count: 1 })

  const req = new Request('http://localhost/api/channels/1/sync', { method: 'POST' })
  const res = await POST(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.added).toBe(1)
})
