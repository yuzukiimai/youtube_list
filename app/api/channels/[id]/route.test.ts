import { DELETE } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

test('DELETE removes the channel and returns deleted:true', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({ id: 1 } as any)
  vi.mocked(prisma.channel.delete).mockResolvedValue({ id: 1 } as any)

  const req = new Request('http://localhost/api/channels/1', { method: 'DELETE' })
  const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ deleted: true })
  expect(prisma.channel.delete).toHaveBeenCalledWith({ where: { id: 1 } })
})

test('DELETE returns 404 when channel not found', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(null)

  const req = new Request('http://localhost/api/channels/99', { method: 'DELETE' })
  const res = await DELETE(req, { params: Promise.resolve({ id: '99' }) })

  expect(res.status).toBe(404)
  expect(prisma.channel.delete).not.toHaveBeenCalled()
})
