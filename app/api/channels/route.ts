import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveChannelFromInput, fetchAllVideos, VideoInfo } from '@/lib/youtube'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const value: unknown = body.input ?? body.url

  if (!value || typeof value !== 'string') {
    return NextResponse.json({ error: 'チャンネル名または URL を入力してください' }, { status: 400 })
  }

  let channelInfo
  try {
    channelInfo = await resolveChannelFromInput(value)
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

  let videos: VideoInfo[]
  try {
    videos = await fetchAllVideos(channelInfo.uploadsPlaylistId)
    await prisma.video.createMany({
      data: videos.map(v => ({
        videoId: v.videoId,
        channelId: channel.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        publishedAt: new Date(v.publishedAt),
      })),
    })
  } catch (e) {
    console.error('[channel register] fetchAllVideos failed:', e)
    await prisma.channel.delete({ where: { id: channel.id } })
    return NextResponse.json({ error: 'Failed to fetch videos from YouTube' }, { status: 500 })
  }

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
    include: { videos: { select: { watched: true, progressSeconds: true } } },
  })

  return NextResponse.json(
    channels.map(ch => ({
      id: ch.id,
      channelId: ch.channelId,
      name: ch.name,
      thumbnailUrl: ch.thumbnailUrl,
      videoCount: ch.videos.length,
      watchedCount: ch.videos.filter(v => v.watched).length,
      inProgressCount: ch.videos.filter(v => !v.watched && v.progressSeconds > 0).length,
    }))
  )
}
