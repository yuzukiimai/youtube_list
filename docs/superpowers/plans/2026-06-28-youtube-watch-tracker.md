# YouTube Watch Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web app where a user registers YouTube channels by URL, views all their videos, and tracks watch progress with an embedded player.

**Architecture:** Next.js 15 App Router with server components for data fetching and client components for interactivity. YouTube Data API v3 provides channel/video data cached in a local SQLite database via Prisma. A YouTube IFrame Player embedded in a 2-column layout auto-saves playback position every 5 seconds.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Prisma ORM, SQLite, YouTube Data API v3, YouTube IFrame Player API, Vitest, @testing-library/react

## Global Constraints

- Next.js 15 with App Router (no Pages Router)
- TypeScript strict mode throughout
- No authentication — single user, no login flow
- PC only — no mobile-responsive requirements
- YouTube API key stored in `YOUTUBE_API_KEY` env var (never exposed to client)
- Database URL stored in `DATABASE_URL` env var (`file:./prisma/dev.db` for local)
- All API mutations go through Route Handlers (not Server Actions)
- Prisma client is a singleton imported from `@/lib/prisma`
- YouTube API calls happen only in server-side code (Route Handlers)
- Test files live alongside source: `*.test.ts` / `*.test.tsx`

---

### Task 1: Project Scaffolding + Vitest Setup

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.local`
- Create: `.gitignore`

**Interfaces:**
- Produces: Working Next.js 15 dev server, passing `vitest` command

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/yuzuki/work/youtube_list
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Expected: `node_modules/` created, `app/` directory exists, `package.json` present.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install prisma @prisma/client
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @types/youtube
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Create vitest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Create .env.local**

```
YOUTUBE_API_KEY=your_api_key_here
DATABASE_URL=file:./prisma/dev.db
```

- [ ] **Step 7: Verify setup with a trivial test**

Create `app/health.test.ts`:
```typescript
test('sanity check', () => {
  expect(1 + 1).toBe(2)
})
```

Run: `npm run test:run`
Expected: `1 passed`

Delete `app/health.test.ts` after confirming it passes.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 15 app with Vitest"
```

---

### Task 2: Prisma Schema + Database Migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`
- Create: `lib/prisma.test.ts`

**Interfaces:**
- Produces:
  - `prisma` singleton exported from `@/lib/prisma` — type `PrismaClient`
  - `Channel` model fields: `id`, `channelId`, `name`, `thumbnailUrl`, `registeredAt`, `videos`
  - `Video` model fields: `id`, `videoId`, `channelId`, `channel`, `title`, `thumbnailUrl`, `duration`, `publishedAt`, `watched`, `watchedAt`, `progressSeconds`

- [ ] **Step 1: Write failing test for prisma singleton**

Create `lib/prisma.test.ts`:
```typescript
import { prisma } from './prisma'

test('prisma singleton is a PrismaClient instance', () => {
  expect(prisma).toBeDefined()
  expect(typeof prisma.channel.findMany).toBe('function')
})
```

Run: `npm run test:run -- lib/prisma.test.ts`
Expected: FAIL with "Cannot find module './prisma'"

- [ ] **Step 2: Create prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Channel {
  id           Int      @id @default(autoincrement())
  channelId    String   @unique
  name         String
  thumbnailUrl String
  registeredAt DateTime @default(now())
  videos       Video[]
}

model Video {
  id              Int       @id @default(autoincrement())
  videoId         String    @unique
  channelId       Int
  channel         Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  title           String
  thumbnailUrl    String
  duration        Int?
  publishedAt     DateTime
  watched         Boolean   @default(false)
  watchedAt       DateTime?
  progressSeconds Int       @default(0)
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: `prisma/dev.db` created, `prisma/migrations/` directory created.

- [ ] **Step 4: Create lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- lib/prisma.test.ts`
Expected: `1 passed`

- [ ] **Step 6: Add prisma/dev.db to .gitignore**

Add to `.gitignore`:
```
prisma/dev.db
prisma/dev.db-journal
.env.local
```

- [ ] **Step 7: Commit**

```bash
git add prisma/ lib/prisma.ts lib/prisma.test.ts .gitignore
git commit -m "feat: add Prisma schema and SQLite database"
```

---

### Task 3: YouTube API Client

**Files:**
- Create: `lib/youtube.ts`
- Create: `lib/youtube.test.ts`

**Interfaces:**
- Produces:
  - `resolveChannelFromUrl(url: string): Promise<ChannelInfo>`
  - `fetchAllVideos(uploadsPlaylistId: string): Promise<VideoInfo[]>`
  - Type `ChannelInfo`: `{ channelId: string; name: string; thumbnailUrl: string; uploadsPlaylistId: string }`
  - Type `VideoInfo`: `{ videoId: string; title: string; thumbnailUrl: string; publishedAt: string }`

- [ ] **Step 1: Write failing tests**

Create `lib/youtube.test.ts`:
```typescript
import { resolveChannelFromUrl, fetchAllVideos } from './youtube'

const mockChannelResponse = {
  items: [{
    id: 'UCtest123',
    snippet: {
      title: 'Test Channel',
      thumbnails: { default: { url: 'https://example.com/thumb.jpg' } },
    },
    contentDetails: {
      relatedPlaylists: { uploads: 'UUtest123' },
    },
  }],
}

const mockPlaylistResponse = {
  items: [
    {
      snippet: {
        resourceId: { kind: 'youtube#video', videoId: 'vid1' },
        title: 'Video One',
        thumbnails: { medium: { url: 'https://example.com/v1.jpg' } },
        publishedAt: '2024-01-15T10:00:00Z',
      },
    },
    {
      snippet: {
        resourceId: { kind: 'youtube#video', videoId: 'vid2' },
        title: 'Private video',
        thumbnails: {},
        publishedAt: '2024-01-10T10:00:00Z',
      },
    },
  ],
  nextPageToken: undefined,
}

beforeEach(() => {
  global.fetch = vi.fn()
})

test('resolveChannelFromUrl resolves @handle URL', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockChannelResponse,
  } as Response)

  const result = await resolveChannelFromUrl('https://www.youtube.com/@testchannel')
  expect(result.channelId).toBe('UCtest123')
  expect(result.name).toBe('Test Channel')
  expect(result.uploadsPlaylistId).toBe('UUtest123')
})

test('resolveChannelFromUrl resolves /channel/ID URL', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockChannelResponse,
  } as Response)

  const result = await resolveChannelFromUrl('https://www.youtube.com/channel/UCtest123')
  expect(result.channelId).toBe('UCtest123')
})

test('resolveChannelFromUrl throws for non-YouTube URL', async () => {
  await expect(resolveChannelFromUrl('https://example.com/test')).rejects.toThrow('Not a YouTube URL')
})

test('resolveChannelFromUrl throws when channel not found', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [] }),
  } as Response)

  await expect(resolveChannelFromUrl('https://www.youtube.com/@nobody')).rejects.toThrow('Channel not found')
})

test('fetchAllVideos returns videos and skips private ones', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => mockPlaylistResponse,
  } as Response)

  const videos = await fetchAllVideos('UUtest123')
  expect(videos).toHaveLength(1)
  expect(videos[0].videoId).toBe('vid1')
  expect(videos[0].title).toBe('Video One')
})
```

Run: `npm run test:run -- lib/youtube.test.ts`
Expected: FAIL with "Cannot find module './youtube'"

- [ ] **Step 2: Create lib/youtube.ts**

```typescript
const BASE = 'https://www.googleapis.com/youtube/v3'

export interface ChannelInfo {
  channelId: string
  name: string
  thumbnailUrl: string
  uploadsPlaylistId: string
}

export interface VideoInfo {
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set')
  return key
}

export async function resolveChannelFromUrl(url: string): Promise<ChannelInfo> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!parsed.hostname.endsWith('youtube.com')) {
    throw new Error('Not a YouTube URL')
  }

  const pathname = parsed.pathname
  let params: Record<string, string>

  if (pathname.startsWith('/@')) {
    params = { forHandle: pathname.slice(2) }
  } else if (pathname.startsWith('/channel/')) {
    params = { id: pathname.slice('/channel/'.length) }
  } else {
    throw new Error('Unsupported YouTube URL format. Use /@handle or /channel/ID')
  }

  const qs = new URLSearchParams({ part: 'snippet,contentDetails', key: apiKey(), ...params })
  const res = await fetch(`${BASE}/channels?${qs}`)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

  const data = await res.json()
  if (!data.items?.length) throw new Error('Channel not found')

  const item = data.items[0]
  return {
    channelId: item.id,
    name: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  }
}

export async function fetchAllVideos(uploadsPlaylistId: string): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = []
  let pageToken: string | undefined

  do {
    const qs = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
      key: apiKey(),
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(`${BASE}/playlistItems?${qs}`)
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      if (item.snippet.resourceId.kind !== 'youtube#video') continue
      const title: string = item.snippet.title
      if (title === 'Private video' || title === 'Deleted video') continue
      videos.push({
        videoId: item.snippet.resourceId.videoId,
        title,
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ?? '',
        publishedAt: item.snippet.publishedAt,
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return videos
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm run test:run -- lib/youtube.test.ts`
Expected: `5 passed`

- [ ] **Step 4: Commit**

```bash
git add lib/youtube.ts lib/youtube.test.ts
git commit -m "feat: add YouTube API client with channel and video fetching"
```

---

### Task 4: Channel Registration API

**Files:**
- Create: `app/api/channels/route.ts`
- Create: `app/api/channels/route.test.ts`

**Interfaces:**
- Consumes:
  - `resolveChannelFromUrl(url: string): Promise<ChannelInfo>` from `@/lib/youtube`
  - `fetchAllVideos(uploadsPlaylistId: string): Promise<VideoInfo[]>` from `@/lib/youtube`
  - `prisma` from `@/lib/prisma`
- Produces:
  - `POST /api/channels` — body: `{ url: string }` → response: `{ id, channelId, name, thumbnailUrl, videoCount }`
  - `GET /api/channels` → response: `Array<{ id, channelId, name, thumbnailUrl, videoCount, watchedCount }>`

- [ ] **Step 1: Write failing tests**

Create `app/api/channels/route.test.ts`:
```typescript
import { POST, GET } from './route'
import { prisma } from '@/lib/prisma'
import * as youtube from '@/lib/youtube'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    video: {
      createMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/youtube')

const mockChannel = {
  id: 1,
  channelId: 'UCtest123',
  name: 'Test Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  registeredAt: new Date(),
}

test('POST /api/channels registers a channel and fetches videos', async () => {
  vi.mocked(youtube.resolveChannelFromUrl).mockResolvedValue({
    channelId: 'UCtest123',
    name: 'Test Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    uploadsPlaylistId: 'UUtest123',
  })
  vi.mocked(youtube.fetchAllVideos).mockResolvedValue([
    { videoId: 'v1', title: 'Video 1', thumbnailUrl: 'https://example.com/v1.jpg', publishedAt: '2024-01-01T00:00:00Z' },
  ])
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.channel.create).mockResolvedValue(mockChannel)
  vi.mocked(prisma.video.createMany).mockResolvedValue({ count: 1 })

  const req = new Request('http://localhost/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.youtube.com/@testchannel' }),
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.channelId).toBe('UCtest123')
  expect(data.videoCount).toBe(1)
})

test('POST /api/channels returns 400 for missing URL', async () => {
  const req = new Request('http://localhost/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})

test('POST /api/channels returns 409 if channel already registered', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(mockChannel)

  const req = new Request('http://localhost/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.youtube.com/@testchannel' }),
  })

  vi.mocked(youtube.resolveChannelFromUrl).mockResolvedValue({
    channelId: 'UCtest123',
    name: 'Test Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    uploadsPlaylistId: 'UUtest123',
  })

  const res = await POST(req)
  expect(res.status).toBe(409)
})

test('GET /api/channels returns channel list with counts', async () => {
  vi.mocked(prisma.channel.findMany).mockResolvedValue([
    { ...mockChannel, videos: [{ watched: true }, { watched: false }] } as any,
  ])

  const req = new Request('http://localhost/api/channels')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data[0].videoCount).toBe(2)
  expect(data[0].watchedCount).toBe(1)
})
```

Run: `npm run test:run -- app/api/channels/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 2: Create app/api/channels/route.ts**

```typescript
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
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm run test:run -- app/api/channels/route.test.ts`
Expected: `4 passed`

- [ ] **Step 4: Commit**

```bash
git add app/api/channels/
git commit -m "feat: add channel registration and listing API"
```

---

### Task 5: Video Sync API

**Files:**
- Create: `app/api/channels/[id]/videos/route.ts`
- Create: `app/api/channels/[id]/videos/route.test.ts`
- Create: `app/api/channels/[id]/sync/route.ts`
- Create: `app/api/channels/[id]/sync/route.test.ts`

**Interfaces:**
- Consumes:
  - `prisma` from `@/lib/prisma`
  - `fetchAllVideos(uploadsPlaylistId: string): Promise<VideoInfo[]>` from `@/lib/youtube`
  - `resolveChannelFromUrl` is NOT used here — channel is already registered
- Produces:
  - `GET /api/channels/[id]/videos` → `Array<{ id, videoId, title, thumbnailUrl, publishedAt, watched, watchedAt, progressSeconds, duration }>`
  - `POST /api/channels/[id]/sync` → `{ added: number }` (fetches new videos from YouTube, upserts into DB)

Note: `[id]` in these routes is the internal DB `Channel.id` (integer).

- [ ] **Step 1: Write failing tests**

Create `app/api/channels/[id]/videos/route.test.ts`:
```typescript
import { GET } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    video: { findMany: vi.fn() },
  },
}))

const mockVideo = {
  id: 1,
  videoId: 'vid1',
  channelId: 1,
  title: 'Video 1',
  thumbnailUrl: 'https://example.com/v1.jpg',
  duration: 600,
  publishedAt: new Date('2024-01-15'),
  watched: false,
  watchedAt: null,
  progressSeconds: 0,
}

test('GET returns videos for a channel', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({ id: 1 } as any)
  vi.mocked(prisma.video.findMany).mockResolvedValue([mockVideo])

  const req = new Request('http://localhost/api/channels/1/videos')
  const res = await GET(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toHaveLength(1)
  expect(data[0].videoId).toBe('vid1')
})

test('GET returns 404 for unknown channel', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(null)

  const req = new Request('http://localhost/api/channels/999/videos')
  const res = await GET(req, { params: Promise.resolve({ id: '999' }) })
  expect(res.status).toBe(404)
})
```

Create `app/api/channels/[id]/sync/route.test.ts`:
```typescript
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import * as youtube from '@/lib/youtube'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: { findUnique: vi.fn() },
    video: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/youtube')

test('POST /sync fetches new videos and returns added count', async () => {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({
    id: 1,
    channelId: 'UCtest',
    uploadsPlaylistId: 'UUtest',
  } as any)
  vi.mocked(prisma.video.findFirst).mockResolvedValue({
    publishedAt: new Date('2024-01-01'),
  } as any)
  vi.mocked(youtube.fetchAllVideos).mockResolvedValue([
    { videoId: 'new1', title: 'New Video', thumbnailUrl: '', publishedAt: '2024-06-01T00:00:00Z' },
  ])
  vi.mocked(prisma.video.createMany).mockResolvedValue({ count: 1 })

  const req = new Request('http://localhost/api/channels/1/sync', { method: 'POST' })
  const res = await POST(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.added).toBe(1)
})
```

Run: `npm run test:run -- app/api/channels`
Expected: FAIL with module not found errors

- [ ] **Step 2: Create app/api/channels/[id]/videos/route.ts**

```typescript
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
```

- [ ] **Step 3: Create app/api/channels/[id]/sync/route.ts**

The sync fetches all videos from YouTube and inserts any not yet in DB (by videoId).

```typescript
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
```

**Important:** The `uploadsPlaylistId` is not stored in the DB schema yet. Add it to the Channel model:

Update `prisma/schema.prisma` — add `uploadsPlaylistId` to Channel:
```prisma
model Channel {
  id                 Int      @id @default(autoincrement())
  channelId          String   @unique
  name               String
  thumbnailUrl       String
  uploadsPlaylistId  String   @default("")
  registeredAt       DateTime @default(now())
  videos             Video[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_uploads_playlist_id
npx prisma generate
```

Update `app/api/channels/route.ts` — pass `uploadsPlaylistId` when creating channel:
```typescript
const channel = await prisma.channel.create({
  data: {
    channelId: channelInfo.channelId,
    name: channelInfo.name,
    thumbnailUrl: channelInfo.thumbnailUrl,
    uploadsPlaylistId: channelInfo.uploadsPlaylistId,
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- app/api/channels`
Expected: `6 passed` (4 from Task 4 + 2 new)

- [ ] **Step 5: Commit**

```bash
git add app/api/channels/ prisma/
git commit -m "feat: add video sync API and uploadsPlaylistId to Channel"
```

---

### Task 6: Video Progress & Watched APIs

**Files:**
- Create: `app/api/videos/[id]/progress/route.ts`
- Create: `app/api/videos/[id]/progress/route.test.ts`
- Create: `app/api/videos/[id]/watched/route.ts`
- Create: `app/api/videos/[id]/watched/route.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`
- Produces:
  - `PATCH /api/videos/[id]/progress` — body: `{ progressSeconds: number; duration?: number }` → `{ progressSeconds, watched }`
    - If `progressSeconds / duration >= 0.95`, also sets `watched = true`
  - `PATCH /api/videos/[id]/watched` — body: `{ watched: boolean }` → `{ watched }`

- [ ] **Step 1: Write failing tests**

Create `app/api/videos/[id]/progress/route.test.ts`:
```typescript
import { PATCH } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const mockVideo = { id: 1, videoId: 'v1', watched: false, watchedAt: null, progressSeconds: 0 }

test('PATCH saves progress', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo as any)
  vi.mocked(prisma.video.update).mockResolvedValue({ ...mockVideo, progressSeconds: 120 } as any)

  const req = new Request('http://localhost/api/videos/1/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressSeconds: 120, duration: 600 }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.progressSeconds).toBe(120)
  expect(data.watched).toBe(false)
})

test('PATCH marks as watched when progress >= 95%', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo as any)
  vi.mocked(prisma.video.update).mockResolvedValue({ ...mockVideo, progressSeconds: 580, watched: true } as any)

  const req = new Request('http://localhost/api/videos/1/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressSeconds: 580, duration: 600 }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
  const data = await res.json()
  expect(data.watched).toBe(true)
})

test('PATCH returns 404 for unknown video', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue(null)

  const req = new Request('http://localhost/api/videos/999/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progressSeconds: 10 }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '999' }) })
  expect(res.status).toBe(404)
})
```

Create `app/api/videos/[id]/watched/route.test.ts`:
```typescript
import { PATCH } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

test('PATCH toggles watched to true', async () => {
  vi.mocked(prisma.video.findUnique).mockResolvedValue({ id: 1, watched: false } as any)
  vi.mocked(prisma.video.update).mockResolvedValue({ id: 1, watched: true, watchedAt: new Date() } as any)

  const req = new Request('http://localhost/api/videos/1/watched', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ watched: true }),
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.watched).toBe(true)
})
```

Run: `npm run test:run -- app/api/videos`
Expected: FAIL with module not found

- [ ] **Step 2: Create app/api/videos/[id]/progress/route.ts**

```typescript
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
```

- [ ] **Step 3: Create app/api/videos/[id]/watched/route.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- app/api/videos`
Expected: `4 passed`

- [ ] **Step 5: Run all tests**

Run: `npm run test:run`
Expected: All tests pass (no failures)

- [ ] **Step 6: Commit**

```bash
git add app/api/videos/
git commit -m "feat: add video progress and watched toggle APIs"
```

---

### Task 7: Home Page + Components

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css` (remove default styles)
- Create: `components/ChannelCard.tsx`
- Create: `components/ChannelCard.test.tsx`
- Create: `components/RegisterChannelForm.tsx`
- Create: `components/RegisterChannelForm.test.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/channels` for channel list
  - `POST /api/channels` for registration
- Produces: Rendered home page at `/`

- [ ] **Step 1: Write failing component tests**

Create `components/ChannelCard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { ChannelCard } from './ChannelCard'

const mockChannel = {
  id: 1,
  channelId: 'UCtest',
  name: 'Test Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  videoCount: 42,
  watchedCount: 10,
}

test('renders channel name', () => {
  render(<ChannelCard channel={mockChannel} />)
  expect(screen.getByText('Test Channel')).toBeInTheDocument()
})

test('renders video and watched counts', () => {
  render(<ChannelCard channel={mockChannel} />)
  expect(screen.getByText('10 / 42')).toBeInTheDocument()
})
```

Create `components/RegisterChannelForm.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterChannelForm } from './RegisterChannelForm'

test('renders URL input and submit button', () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  expect(screen.getByPlaceholderText(/youtube.com\/@/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /登録/i })).toBeInTheDocument()
})

test('shows error when URL is empty on submit', async () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /登録/i }))
  expect(screen.getByText(/URLを入力してください/i)).toBeInTheDocument()
})
```

Run: `npm run test:run -- components/ChannelCard.test.tsx components/RegisterChannelForm.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 2: Create components/ChannelCard.tsx**

```typescript
import Link from 'next/link'
import Image from 'next/image'

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
  videoCount: number
  watchedCount: number
}

export function ChannelCard({ channel }: { channel: Channel }) {
  const progress = channel.videoCount > 0
    ? Math.round((channel.watchedCount / channel.videoCount) * 100)
    : 0

  return (
    <Link href={`/channels/${channel.channelId}`} className="block rounded-lg border p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={channel.thumbnailUrl}
          alt={channel.name}
          width={48}
          height={48}
          className="rounded-full"
        />
        <h2 className="font-semibold text-gray-900 line-clamp-2">{channel.name}</h2>
      </div>
      <div className="text-sm text-gray-500 mb-2">{channel.watchedCount} / {channel.videoCount} 視聴済み</div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create components/RegisterChannelForm.tsx**

```typescript
'use client'

import { useState } from 'react'

export function RegisterChannelForm({ onRegistered }: { onRegistered: () => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) {
      setError('URLを入力してください')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '登録に失敗しました')
        return
      }
      setUrl('')
      onRegistered()
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/@channelname"
        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '登録中...' : '登録'}
      </button>
      {error && <p className="text-red-500 text-sm self-center">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 4: Rewrite app/page.tsx**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChannelCard } from '@/components/ChannelCard'
import { RegisterChannelForm } from '@/components/RegisterChannelForm'

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
  videoCount: number
  watchedCount: number
}

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>([])

  const loadChannels = useCallback(async () => {
    const res = await fetch('/api/channels')
    if (res.ok) setChannels(await res.json())
  }, [])

  useEffect(() => { loadChannels() }, [loadChannels])

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">YouTube Watch Tracker</h1>
      <RegisterChannelForm onRegistered={loadChannels} />
      {channels.length === 0 ? (
        <p className="text-gray-500 text-center py-16">チャンネルを登録してください</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {channels.map(ch => <ChannelCard key={ch.id} channel={ch} />)}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Run component tests**

Run: `npm run test:run -- components/ChannelCard.test.tsx components/RegisterChannelForm.test.tsx`
Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/ChannelCard.tsx components/RegisterChannelForm.tsx components/ChannelCard.test.tsx components/RegisterChannelForm.test.tsx
git commit -m "feat: add home page with channel list and registration form"
```

---

### Task 8: YouTube Player Component + Channel Page

**Files:**
- Create: `components/YoutubePlayer.tsx`
- Create: `components/YoutubePlayer.test.tsx`
- Create: `components/VideoCard.tsx`
- Create: `components/VideoCard.test.tsx`
- Create: `components/VideoFilter.tsx`
- Create: `components/VideoFilter.test.tsx`
- Create: `app/channels/[channelId]/page.tsx`
- Create: `app/channels/[channelId]/ChannelPageClient.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/channels/[id]/videos`
  - `PATCH /api/videos/[id]/progress`
  - `PATCH /api/videos/[id]/watched`
  - `POST /api/channels/[id]/sync`
- Produces: Rendered channel page at `/channels/[channelId]`

- [ ] **Step 1: Write failing tests**

Create `components/VideoFilter.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoFilter } from './VideoFilter'

test('renders filter buttons and search input', () => {
  render(<VideoFilter filter="all" keyword="" onFilterChange={() => {}} onKeywordChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '未視聴' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '視聴済み' })).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/タイトルで検索/i)).toBeInTheDocument()
})

test('calls onFilterChange when button is clicked', async () => {
  const onFilterChange = vi.fn()
  render(<VideoFilter filter="all" keyword="" onFilterChange={onFilterChange} onKeywordChange={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: '未視聴' }))
  expect(onFilterChange).toHaveBeenCalledWith('unwatched')
})
```

Create `components/VideoCard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoCard } from './VideoCard'

const mockVideo = {
  id: 1,
  videoId: 'vid1',
  title: 'Test Video',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  publishedAt: '2024-01-15T00:00:00Z',
  watched: false,
  watchedAt: null,
  progressSeconds: 0,
  duration: null,
}

test('renders video title', () => {
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={() => {}} onToggleWatched={() => {}} />)
  expect(screen.getByText('Test Video')).toBeInTheDocument()
})

test('calls onSelect when card is clicked', async () => {
  const onSelect = vi.fn()
  render(<VideoCard video={mockVideo} isSelected={false} onSelect={onSelect} onToggleWatched={() => {}} />)
  await userEvent.click(screen.getByText('Test Video'))
  expect(onSelect).toHaveBeenCalledWith(mockVideo)
})

test('shows watched badge when watched', () => {
  render(<VideoCard video={{ ...mockVideo, watched: true }} isSelected={false} onSelect={() => {}} onToggleWatched={() => {}} />)
  expect(screen.getByText('視聴済み')).toBeInTheDocument()
})
```

Create `components/YoutubePlayer.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { YoutubePlayer } from './YoutubePlayer'

// Mock YouTube IFrame API
vi.stubGlobal('YT', {
  Player: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(120),
    getDuration: vi.fn().mockReturnValue(600),
  })),
  PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
})

test('renders a container div', () => {
  render(
    <YoutubePlayer
      videoId="vid1"
      startSeconds={0}
      onProgress={() => {}}
      onEnded={() => {}}
    />
  )
  expect(document.querySelector('[data-testid="yt-player-container"]')).toBeInTheDocument()
})
```

Run: `npm run test:run -- components/VideoFilter.test.tsx components/VideoCard.test.tsx components/YoutubePlayer.test.tsx`
Expected: FAIL with module not found errors

- [ ] **Step 2: Create components/VideoFilter.tsx**

```typescript
type Filter = 'all' | 'watched' | 'unwatched'

interface Props {
  filter: Filter
  keyword: string
  onFilterChange: (f: Filter) => void
  onKeywordChange: (k: string) => void
}

export function VideoFilter({ filter, keyword, onFilterChange, onKeywordChange }: Props) {
  const buttons: { label: string; value: Filter }[] = [
    { label: 'すべて', value: 'all' },
    { label: '未視聴', value: 'unwatched' },
    { label: '視聴済み', value: 'watched' },
  ]

  return (
    <div className="flex gap-2 items-center p-3 border-b">
      <div className="flex gap-1">
        {buttons.map(b => (
          <button
            key={b.value}
            onClick={() => onFilterChange(b.value)}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === b.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={keyword}
        onChange={e => onKeywordChange(e.target.value)}
        placeholder="タイトルで検索..."
        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
```

- [ ] **Step 3: Create components/VideoCard.tsx**

```typescript
import Image from 'next/image'

interface Video {
  id: number
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  watched: boolean
  watchedAt: string | null
  progressSeconds: number
  duration: number | null
}

interface Props {
  video: Video
  isSelected: boolean
  onSelect: (video: Video) => void
  onToggleWatched: (video: Video) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function VideoCard({ video, isSelected, onSelect, onToggleWatched }: Props) {
  const progress = video.duration && video.duration > 0
    ? Math.round((video.progressSeconds / video.duration) * 100)
    : 0

  return (
    <div
      onClick={() => onSelect(video)}
      className={`flex gap-2 p-2 cursor-pointer hover:bg-gray-50 border-b ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <Image
          src={video.thumbnailUrl || '/placeholder.png'}
          alt={video.title}
          width={120}
          height={68}
          className="rounded object-cover"
        />
        {video.watched && (
          <span className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1 rounded">視聴済み</span>
        )}
        {!video.watched && video.progressSeconds > 0 && (
          <span className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-1 rounded">視聴中</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{video.title}</p>
        <p className="text-xs text-gray-500 mt-1">{formatDate(video.publishedAt)}</p>
        {video.progressSeconds > 0 && (
          <p className="text-xs text-gray-400">{formatSeconds(video.progressSeconds)} まで視聴</p>
        )}
        {video.duration && video.duration > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onToggleWatched(video) }}
          className={`mt-1 text-xs px-2 py-0.5 rounded ${
            video.watched
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {video.watched ? '✓ 観た' : '観た'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create components/YoutubePlayer.tsx**

```typescript
'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

interface Props {
  videoId: string
  startSeconds: number
  onProgress: (seconds: number, duration: number) => void
  onEnded: () => void
}

export function YoutubePlayer({ videoId, startSeconds, onProgress, onEnded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let destroyed = false

    const startInterval = (player: YT.Player) => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        if (destroyed) return
        const current = player.getCurrentTime?.() ?? 0
        const duration = player.getDuration?.() ?? 0
        onProgress(current, duration)
      }, 5000)
    }

    const initPlayer = () => {
      if (!containerRef.current || destroyed) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        playerVars: { start: Math.floor(startSeconds), rel: 0 },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            const duration = e.target.getDuration()
            onProgress(startSeconds, duration)
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              startInterval(playerRef.current!)
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current)
              if (e.data === window.YT.PlayerState.ENDED) onEnded()
            }
          },
        },
      })
    }

    if (typeof window !== 'undefined') {
      if (window.YT?.Player) {
        initPlayer()
      } else {
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const script = document.createElement('script')
          script.src = 'https://www.youtube.com/iframe_api'
          document.head.appendChild(script)
        }
        const prev = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => {
          prev?.()
          initPlayer()
        }
      }
    }

    return () => {
      destroyed = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      playerRef.current?.destroy()
    }
  }, [videoId])

  return <div ref={containerRef} data-testid="yt-player-container" />
}
```

- [ ] **Step 5: Create app/channels/[channelId]/ChannelPageClient.tsx**

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'
import { VideoCard } from '@/components/VideoCard'
import { VideoFilter } from '@/components/VideoFilter'
import { YoutubePlayer } from '@/components/YoutubePlayer'
import Image from 'next/image'

type Filter = 'all' | 'watched' | 'unwatched'

interface Video {
  id: number
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  watched: boolean
  watchedAt: string | null
  progressSeconds: number
  duration: number | null
}

interface Channel {
  id: number
  channelId: string
  name: string
  thumbnailUrl: string
}

interface Props {
  channel: Channel
  initialVideos: Video[]
}

export function ChannelPageClient({ channel, initialVideos }: Props) {
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [selected, setSelected] = useState<Video | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [keyword, setKeyword] = useState('')
  const [syncing, setSyncing] = useState(false)

  const filteredVideos = useMemo(() => {
    return videos
      .filter(v => {
        if (filter === 'watched') return v.watched
        if (filter === 'unwatched') return !v.watched
        return true
      })
      .filter(v => !keyword || v.title.toLowerCase().includes(keyword.toLowerCase()))
  }, [videos, filter, keyword])

  const handleProgress = useCallback(async (seconds: number, duration: number) => {
    if (!selected) return
    const res = await fetch(`/api/videos/${selected.id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressSeconds: Math.floor(seconds), duration: Math.floor(duration) }),
    })
    if (!res.ok) return
    const data = await res.json()
    setVideos(prev => prev.map(v =>
      v.id === selected.id
        ? { ...v, progressSeconds: data.progressSeconds, watched: data.watched }
        : v
    ))
    if (data.watched && !selected.watched) {
      setSelected(s => s ? { ...s, watched: true } : s)
    }
  }, [selected])

  const handleEnded = useCallback(async () => {
    if (!selected) return
    const res = await fetch(`/api/videos/${selected.id}/watched`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched: true }),
    })
    if (!res.ok) return
    setVideos(prev => prev.map(v => v.id === selected.id ? { ...v, watched: true } : v))
  }, [selected])

  const handleToggleWatched = useCallback(async (video: Video) => {
    const next = !video.watched
    const res = await fetch(`/api/videos/${video.id}/watched`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched: next }),
    })
    if (!res.ok) return
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, watched: next } : v))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch(`/api/channels/${channel.id}/sync`, { method: 'POST' })
      const res = await fetch(`/api/channels/${channel.id}/videos`)
      if (res.ok) setVideos(await res.json())
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: video list */}
      <div className="w-2/5 flex flex-col border-r">
        <div className="flex items-center gap-3 p-3 border-b">
          <Image src={channel.thumbnailUrl} alt={channel.name} width={40} height={40} className="rounded-full" />
          <h1 className="font-bold text-gray-900 flex-1 truncate">{channel.name}</h1>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {syncing ? '更新中...' : '更新'}
          </button>
        </div>
        <VideoFilter filter={filter} keyword={keyword} onFilterChange={setFilter} onKeywordChange={setKeyword} />
        <div className="flex-1 overflow-y-auto">
          {filteredVideos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">動画がありません</p>
          ) : (
            filteredVideos.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                isSelected={selected?.id === v.id}
                onSelect={setSelected}
                onToggleWatched={handleToggleWatched}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: player */}
      <div className="w-3/5 flex flex-col">
        {selected ? (
          <>
            <div className="aspect-video w-full bg-black">
              <YoutubePlayer
                key={selected.videoId}
                videoId={selected.videoId}
                startSeconds={selected.progressSeconds}
                onProgress={handleProgress}
                onEnded={handleEnded}
              />
            </div>
            <div className="p-4">
              <h2 className="font-semibold text-gray-900">{selected.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(selected.publishedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            左の一覧から動画を選んでください
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create app/channels/[channelId]/page.tsx**

```typescript
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
```

- [ ] **Step 7: Run all component tests**

Run: `npm run test:run -- components/VideoFilter.test.tsx components/VideoCard.test.tsx components/YoutubePlayer.test.tsx`
Expected: `5 passed`

- [ ] **Step 8: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

- [ ] **Step 9: Remove default Next.js content**

In `app/globals.css`, remove everything except the Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

In `app/layout.tsx`, update the metadata title:
```typescript
export const metadata: Metadata = {
  title: 'YouTube Watch Tracker',
  description: 'Track your YouTube watch progress',
}
```

- [ ] **Step 10: Commit**

```bash
git add app/ components/
git commit -m "feat: add channel page with video list, embedded player, and progress tracking"
```

---

## Self-Review Checklist

After writing tasks, verify spec coverage:

| Spec requirement | Covered by |
|---|---|
| Register channel by URL | Task 4 (POST /api/channels) + Task 7 (RegisterChannelForm) |
| Fetch all videos via YouTube API | Task 3 (youtube.ts) + Task 4 (createMany after register) |
| Watch progress auto-save every 5s | Task 8 (YoutubePlayer interval) + Task 6 (PATCH /progress) |
| Resume from saved position | Task 8 (YoutubePlayer startSeconds prop) |
| Auto-mark watched at 95% | Task 6 (progress route 0.95 check) |
| Manual watched toggle | Task 6 (PATCH /watched) + Task 8 (VideoCard button) |
| Filter by watched/unwatched | Task 8 (VideoFilter + useMemo in ChannelPageClient) |
| Keyword search | Task 8 (VideoFilter + useMemo in ChannelPageClient) |
| Re-sync new videos | Task 5 (POST /sync) + Task 8 (更新 button) |
| 2-column layout (PC) | Task 8 (ChannelPageClient flex layout) |
| SQLite → PostgreSQL migration path | Task 2 (DATABASE_URL env var) |
| Future Cognito userId slot | Noted in schema comment |
