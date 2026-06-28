import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChannelPageClient } from './ChannelPageClient'

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const { channelId } = await params

  const channel = await prisma.channel.findUnique({
    where: { channelId },
  })
  if (!channel) notFound()

  const videos = await prisma.video.findMany({
    where: { channelId: channel.id },
    orderBy: { publishedAt: 'desc' },
  })

  return (
    <ChannelPageClient
      channel={{
        id: channel.id,
        channelId: channel.channelId,
        name: channel.name,
        thumbnailUrl: channel.thumbnailUrl,
      }}
      initialVideos={videos.map(v => ({
        id: v.id,
        videoId: v.videoId,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        publishedAt: v.publishedAt.toISOString(),
        watched: v.watched,
        watchedAt: v.watchedAt?.toISOString() ?? null,
        progressSeconds: v.progressSeconds,
      }))}
    />
  )
}
