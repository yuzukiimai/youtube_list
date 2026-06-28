import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchAllVideos } from '@/lib/youtube'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const channelId = parseInt(id, 10)

  const channel = await prisma.channel.findUnique({ where: { id: channelId } }) as any
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const videos = await fetchAllVideos(channel.uploadsPlaylistId)

  const result = await prisma.video.createMany({
    data: videos.map(v => ({
      videoId: v.videoId,
      channelId,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      publishedAt: new Date(v.publishedAt),
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({ added: result.count })
}
