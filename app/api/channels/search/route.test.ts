import { GET } from './route'
import * as youtube from '@/lib/youtube'

vi.mock('@/lib/youtube')

beforeEach(() => {
  vi.clearAllMocks()
})

test('GET returns candidates for a query', async () => {
  vi.mocked(youtube.searchChannels).mockResolvedValue([
    { channelId: 'UCx', name: 'Found', thumbnailUrl: 't.jpg', description: 'd' },
  ])

  const req = new Request('http://localhost/api/channels/search?q=found')
  const res = await GET(req)

  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toHaveLength(1)
  expect(data[0].channelId).toBe('UCx')
  expect(youtube.searchChannels).toHaveBeenCalledWith('found')
})

test('GET returns empty array when q is missing', async () => {
  const req = new Request('http://localhost/api/channels/search')
  const res = await GET(req)

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual([])
  expect(youtube.searchChannels).not.toHaveBeenCalled()
})
