import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchAllVideos, fetchVideoDurations } from '@/lib/youtube'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const channelId = parseInt(id, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channel = await prisma.channel.findUnique({ where: { id: channelId } }) as any
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const existing = await prisma.video.findMany({ where: { channelId }, select: { videoId: true } })
  const existingIds = new Set(existing.map(v => v.videoId))

  // Stop paginating once we reach a video we already have.
  const fetched = await fetchAllVideos(channel.uploadsPlaylistId, { knownIds: existingIds })
  const newVideos = fetched.filter(v => !existingIds.has(v.videoId))

  let added = 0
  if (newVideos.length > 0) {
    const result = await prisma.video.createMany({
      data: newVideos.map(v => ({
        videoId: v.videoId,
        channelId,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        publishedAt: new Date(v.publishedAt),
      })),
    })
    added = result.count
  }

  // Backfill durations for any videos that don't have one yet (incl. existing rows
  // from before this feature, and the videos we just added).
  const missing = await prisma.video.findMany({
    where: { channelId, duration: null },
    select: { videoId: true },
  })
  let durationsFilled = 0
  if (missing.length > 0) {
    const durations = await fetchVideoDurations(missing.map(v => v.videoId))
    const entries = Object.entries(durations)
    // Update in chunks to keep each transaction small.
    for (let i = 0; i < entries.length; i += 200) {
      const chunk = entries.slice(i, i + 200)
      await prisma.$transaction(
        chunk.map(([videoId, duration]) =>
          prisma.video.update({ where: { videoId }, data: { duration } })
        )
      )
    }
    durationsFilled = entries.length
  }

  return NextResponse.json({ added, durationsFilled })
}
