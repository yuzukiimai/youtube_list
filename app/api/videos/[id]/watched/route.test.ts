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

test('PATCH toggles watched to true', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue({ id: 1, watched: false } as any)
  vi.mocked(prisma.video.update).mockResolvedValue({ id: 1, watched: true, watchedAt: new Date() } as any)

  const req = new Request('http://localhost/api/videos/1/watched', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ watched: true }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.watched).toBe(true)
})
