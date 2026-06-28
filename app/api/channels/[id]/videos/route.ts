import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const channelId = parseInt(id, 10)

  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const videos = await prisma.video.findMany({
    where: { channelId },
    orderBy: { publishedAt: 'desc' },
  })

  return NextResponse.json(
    videos.map(v => ({
      id: v.id,
      videoId: v.videoId,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      publishedAt: v.publishedAt.toISOString(),
      watched: v.watched,
      watchedAt: v.watchedAt?.toISOString() ?? null,
      progressSeconds: v.progressSeconds,
    }))
  )
}
