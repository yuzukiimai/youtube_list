const BASE = 'https://www.googleapis.com/youtube/v3'

export interface ChannelInfo {
  channelId: string
  name: string
  thumbnailUrl: string
  uploadsPlaylistId: string
}

export interface ChannelCandidate {
  channelId: string
  name: string
  thumbnailUrl: string
  description: string
}

export interface VideoInfo {
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set')
  return key
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChannel(item: any): ChannelInfo {
  return {
    channelId: item.id,
    name: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  }
}

async function resolveByParams(params: Record<string, string>): Promise<ChannelInfo> {
  const qs = new URLSearchParams({ part: 'snippet,contentDetails', key: apiKey(), ...params })
  const res = await fetch(`${BASE}/channels?${qs}`)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()
  if (!data.items?.length) throw new Error('チャンネルが見つかりませんでした')
  return mapChannel(data.items[0])
}

async function resolveByVideoId(videoId: string): Promise<ChannelInfo> {
  const qs = new URLSearchParams({ part: 'snippet', id: videoId, key: apiKey() })
  const res = await fetch(`${BASE}/videos?${qs}`)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()
  if (!data.items?.length) throw new Error('動画が見つかりませんでした')
  return resolveByParams({ id: data.items[0].snippet.channelId })
}

async function resolveBySearch(query: string): Promise<ChannelInfo> {
  const candidates = await searchChannels(query)
  if (!candidates.length) throw new Error('チャンネルが見つかりませんでした')
  return resolveByParams({ id: candidates[0].channelId })
}

/**
 * Resolve a channel from almost anything the user might paste:
 * - a raw channel ID (UC...)
 * - a bare @handle or handle
 * - a channel URL (/@handle, /channel/ID, /user/name, /c/name)
 * - a video URL (watch?v=, youtu.be/, /shorts/, /live/, /embed/)
 */
export async function resolveChannelFromInput(input: string): Promise<ChannelInfo> {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('チャンネル名または URL を入力してください')

  // Raw channel ID
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return resolveByParams({ id: trimmed })
  }

  // Bare @handle or handle (no slashes, no spaces)
  if (!trimmed.includes('/') && !trimmed.includes(' ') && /^@?[\w.\-]+$/.test(trimmed)) {
    return resolveByParams({ forHandle: trimmed.replace(/^@/, '') })
  }

  // From here on, treat it as a URL
  let parsed: URL
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    throw new Error('URL を認識できませんでした')
  }
  const host = parsed.hostname.replace(/^www\./, '')

  // Short video link: youtu.be/<videoId>
  if (host === 'youtu.be') {
    const videoId = parsed.pathname.slice(1).split('/')[0]
    if (!videoId) throw new Error('動画 ID を取得できませんでした')
    return resolveByVideoId(videoId)
  }

  if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) {
    throw new Error('YouTube の URL ではありません')
  }

  // Video URLs
  if (parsed.pathname === '/watch') {
    const videoId = parsed.searchParams.get('v')
    if (!videoId) throw new Error('動画 ID を取得できませんでした')
    return resolveByVideoId(videoId)
  }
  const videoPath = parsed.pathname.match(/^\/(shorts|live|embed|v)\/([\w-]+)/)
  if (videoPath) {
    return resolveByVideoId(videoPath[2])
  }

  // Channel URLs
  const path = parsed.pathname
  if (path.startsWith('/@')) {
    return resolveByParams({ forHandle: path.slice(2).split('/')[0] })
  }
  if (path.startsWith('/channel/')) {
    return resolveByParams({ id: path.slice('/channel/'.length).split('/')[0] })
  }
  if (path.startsWith('/user/')) {
    return resolveByParams({ forUsername: path.slice('/user/'.length).split('/')[0] })
  }
  if (path.startsWith('/c/')) {
    // Legacy custom URL — no direct API lookup, so fall back to search
    return resolveBySearch(path.slice('/c/'.length).split('/')[0])
  }

  throw new Error('対応していない YouTube URL です')
}

/** Search channels by name/keyword. Returns up to 8 candidates. */
export async function searchChannels(query: string): Promise<ChannelCandidate[]> {
  const q = query.trim()
  if (!q) return []
  const qs = new URLSearchParams({
    part: 'snippet',
    type: 'channel',
    maxResults: '8',
    q,
    key: apiKey(),
  })
  const res = await fetch(`${BASE}/search?${qs}`)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.items ?? []).map((item: any) => ({
    channelId: typeof item.id === 'string' ? item.id : item.id.channelId,
    name: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
    description: item.snippet.description ?? '',
  }))
}

export async function fetchAllVideos(
  uploadsPlaylistId: string,
  opts?: { knownIds?: Set<string> }
): Promise<VideoInfo[]> {
  // The uploads playlist is newest-first. When `knownIds` is given (sync), stop
  // as soon as we reach a video we already have — everything after it is older.
  const known = opts?.knownIds
  const videos: VideoInfo[] = []
  let pageToken: string | undefined

  outer: do {
    const qs = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: apiKey(),
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(`${BASE}/playlistItems?${qs}`)
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      if (item.snippet.resourceId.kind !== 'youtube#video') continue
      const videoId: string = item.snippet.resourceId.videoId
      if (known?.has(videoId)) break outer
      const title: string = item.snippet.title
      if (title === 'Private video' || title === 'Deleted video') continue
      videos.push({
        videoId,
        title,
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ?? '',
        publishedAt: item.snippet.publishedAt,
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return videos
}

/** Convert an ISO 8601 duration (e.g. "PT1H2M3S") to seconds. */
export function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0', 10) * 3600) + (parseInt(m[2] ?? '0', 10) * 60) + parseInt(m[3] ?? '0', 10)
}

/** Fetch durations (in seconds) for the given video IDs, batched 50 per request. */
export async function fetchVideoDurations(videoIds: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const qs = new URLSearchParams({ part: 'contentDetails', id: batch.join(','), key: apiKey() })
    const res = await fetch(`${BASE}/videos?${qs}`)
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
    const data = await res.json()
    for (const item of data.items ?? []) {
      result[item.id] = parseDuration(item.contentDetails.duration)
    }
  }
  return result
}
