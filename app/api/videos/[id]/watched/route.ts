import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const videoId = parseInt(id, 10)
  const body = await req.json().catch(() => ({}))
  const { watched } = body

  if (typeof watched !== 'boolean') {
    return NextResponse.json({ error: 'watched (boolean) is required' }, { status: 400 })
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } })
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: {
      watched,
      watchedAt: watched ? new Date() : null,
    },
  })

  return NextResponse.json({ watched: updated.watched })
}
