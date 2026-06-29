import { POST } from './route'
import { prisma } from '@/lib/prisma'
import * as youtube from '@/lib/youtube'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    video: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('@/lib/youtube')

beforeEach(() => {
  vi.clearAllMocks()
})

test('POST /sync adds new videos and backfills durations', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({
    id: 1,
    channelId: 'UCtest',
    uploadsPlaylistId: 'UUtest',
  } as any)
  // 1st findMany: existing ids. 2nd findMany: videos missing duration.
  vi.mocked(prisma.video.findMany)
    .mockResolvedValueOnce([{ videoId: 'existing1' } as any])
    .mockResolvedValueOnce([{ videoId: 'new1' } as any])
  vi.mocked(youtube.fetchAllVideos).mockResolvedValue([
    { videoId: 'new1', title: 'New Video', thumbnailUrl: '', publishedAt: '2024-06-01T00:00:00Z' },
  ])
  vi.mocked(prisma.video.createMany).mockResolvedValue({ count: 1 })
  vi.mocked(youtube.fetchVideoDurations).mockResolvedValue({ new1: 120 })
  vi.mocked(prisma.$transaction).mockResolvedValue([])

  const req = new Request('http://localhost/api/channels/1/sync', { method: 'POST' })
  const res = await POST(req, { params: Promise.resolve({ id: '1' }) })

  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.added).toBe(1)
  expect(data.durationsFilled).toBe(1)
  expect(youtube.fetchVideoDurations).toHaveBeenCalledWith(['new1'])
})
