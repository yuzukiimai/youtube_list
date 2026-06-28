import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveChannelFromUrl, fetchAllVideos } from '@/lib/youtube'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { url } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let channelInfo
  try {
    channelInfo = await resolveChannelFromUrl(url)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const existing = await prisma.channel.findUnique({
    where: { channelId: channelInfo.channelId },
  })
  if (existing) {
    return NextResponse.json({ error: 'Channel already registered' }, { status: 409 })
  }

  const channel = await prisma.channel.create({
    data: {
      channelId: channelInfo.channelId,
      name: channelInfo.name,
      thumbnailUrl: channelInfo.thumbnailUrl,
      uploadsPlaylistId: channelInfo.uploadsPlaylistId,
    },
  })

  const videos = await fetchAllVideos(channelInfo.uploadsPlaylistId)
  await prisma.video.createMany({
    data: videos.map(v => ({
      videoId: v.videoId,
      channelId: channel.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      publishedAt: new Date(v.publishedAt),
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({
    id: channel.id,
    channelId: channel.channelId,
    name: channel.name,
    thumbnailUrl: channel.thumbnailUrl,
    videoCount: videos.length,
  })
}

export async function GET(_req: Request) {
  const channels = await prisma.channel.findMany({
    orderBy: { registeredAt: 'desc' },
    include: { videos: { select: { watched: true } } },
  })

  return NextResponse.json(
    channels.map(ch => ({
      id: ch.id,
      channelId: ch.channelId,
      name: ch.name,
      thumbnailUrl: ch.thumbnailUrl,
      videoCount: ch.videos.length,
      watchedCount: ch.videos.filter(v => v.watched).length,
    }))
  )
}
