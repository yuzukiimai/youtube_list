import { NextResponse } from 'next/server'
import { searchChannels } from '@/lib/youtube'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  try {
    const results = await searchChannels(q)
    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
