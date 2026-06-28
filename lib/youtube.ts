const BASE = 'https://www.googleapis.com/youtube/v3'

export interface ChannelInfo {
  channelId: string
  name: string
  thumbnailUrl: string
  uploadsPlaylistId: string
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

export async function resolveChannelFromUrl(url: string): Promise<ChannelInfo> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!parsed.hostname.endsWith('youtube.com')) {
    throw new Error('Not a YouTube URL')
  }

  const pathname = parsed.pathname
  let params: Record<string, string>

  if (pathname.startsWith('/@')) {
    params = { forHandle: pathname.slice(2) }
  } else if (pathname.startsWith('/channel/')) {
    params = { id: pathname.slice('/channel/'.length) }
  } else {
    throw new Error('Unsupported YouTube URL format. Use /@handle or /channel/ID')
  }

  const qs = new URLSearchParams({ part: 'snippet,contentDetails', key: apiKey(), ...params })
  const res = await fetch(`${BASE}/channels?${qs}`)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

  const data = await res.json()
  if (!data.items?.length) throw new Error('Channel not found')

  const item = data.items[0]
  return {
    channelId: item.id,
    name: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  }
}

export async function fetchAllVideos(uploadsPlaylistId: string): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = []
  let pageToken: string | undefined

  do {
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
      const title: string = item.snippet.title
      if (title === 'Private video' || title === 'Deleted video') continue
      videos.push({
        videoId: item.snippet.resourceId.videoId,
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
