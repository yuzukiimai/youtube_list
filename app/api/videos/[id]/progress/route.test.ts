import { PATCH } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const mockVideo = { id: 1, videoId: 'v1', watched: false, watchedAt: null, progressSeconds: 0 }

test('PATCH saves progress', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo as any)
  vi.mocked(prisma.video.update).mockResolvedValue({ ...mockVideo, progressSeconds: 120 } as any)

  const req = new Request('http://localhost/api/videos/1/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressSeconds: 120, duration: 600 }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.progressSeconds).toBe(120)
  expect(data.watched).toBe(false)
})

test('PATCH marks as watched when progress >= 95%', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo as any)
  vi.mocked(prisma.video.update).mockResolvedValue({ ...mockVideo, progressSeconds: 580, watched: true } as any)

  const req = new Request('http://localhost/api/videos/1/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressSeconds: 580, duration: 600 }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
  const data = await res.json()
  expect(data.watched).toBe(true)
})

test('PATCH returns 404 for unknown video', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue(null)

  const req = new Request('http://localhost/api/videos/999/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressSeconds: 10 }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '999' }) })
  expect(res.status).toBe(404)
})
