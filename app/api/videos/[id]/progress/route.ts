import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const videoId = parseInt(id, 10)
  const body = await req.json().catch(() => ({}))
  const { progressSeconds, duration } = body

  if (typeof progressSeconds !== 'number') {
    return NextResponse.json({ error: 'progressSeconds is required' }, { status: 400 })
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } })
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  const isNearEnd = duration && duration > 0 && progressSeconds / duration >= 0.95
  const updated = await prisma.video.update({
    where: { id: videoId },
    data: {
      progressSeconds,
      ...(duration ? { duration } : {}),
      ...(isNearEnd && !video.watched ? { watched: true, watchedAt: new Date() } : {}),
    },
  })

  return NextResponse.json({ progressSeconds: updated.progressSeconds, watched: updated.watched })
}
