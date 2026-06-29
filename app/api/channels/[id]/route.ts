import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const channelId = Number(id)
  if (!Number.isInteger(channelId)) {
    return NextResponse.json({ error: 'Invalid channel id' }, { status: 400 })
  }

  const existing = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!existing) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  // Video rows are removed automatically via onDelete: Cascade
  await prisma.channel.delete({ where: { id: channelId } })

  return NextResponse.json({ deleted: true })
}
