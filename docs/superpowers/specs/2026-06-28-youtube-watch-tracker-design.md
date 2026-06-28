# YouTube Watch Tracker — Design Spec

Date: 2026-06-28

## Overview

Next.js web app that lets a single user register YouTubers by channel URL, view all their videos, and track which ones they've watched.

## Goals

- Register YouTube channels by URL
- Fetch and display all videos for a channel (via YouTube Data API v3)
- Mark individual videos as watched / unwatched
- Filter by watched status and search by keyword

## Non-Goals (for now)

- User authentication (planned: AWS Cognito in the future)
- Deployment (future target: AWS)
- Multiple users

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | |
| Database | SQLite + Prisma ORM | Switch to PostgreSQL (RDS) for AWS deployment — env var only |
| Styling | Tailwind CSS | |
| External API | YouTube Data API v3 | Free, 10,000 units/day quota |

## Screen Structure

### `/` — Home

- List of registered channels (card per channel: icon, name, video count, watched count)
- Form to register a new channel by YouTube channel URL (`youtube.com/@handle` or `youtube.com/channel/ID`)
- Click a channel card → navigate to `/channels/[channelId]`

### `/channels/[channelId]` — Video List + Player

Two-column layout (PC only):

- **Left column:** video list
  - Filter bar: "All / Watched / Unwatched" toggle + keyword search input
  - Video list sorted by `publishedAt` descending
  - Each item: thumbnail, title, progress bar (% watched), status badge (未視聴 / 視聴中 / 視聴済み)
  - Click a video → loads in right-column player
- **Right column:** embedded YouTube IFrame player
  - Playback position auto-saved every 5 seconds to DB
  - Resumes from last saved position on re-open
  - When video ends (or reaches 95%+), automatically marks as watched
- Channel header: icon + name + "更新" button to re-sync new videos
- On first visit: fetch all videos from YouTube API and cache in DB

## Data Model

```prisma
model Channel {
  id           Int      @id @default(autoincrement())
  channelId    String   @unique   // YouTube channel ID
  name         String
  thumbnailUrl String
  registeredAt DateTime @default(now())
  videos       Video[]
  // userId will be added when Cognito auth is introduced
}

model Video {
  id             Int       @id @default(autoincrement())
  videoId        String    @unique   // YouTube video ID
  channelId      Int
  channel        Channel   @relation(fields: [channelId], references: [id])
  title          String
  thumbnailUrl   String
  duration       Int?              // total duration in seconds
  publishedAt    DateTime
  watched        Boolean   @default(false)
  watchedAt      DateTime?
  progressSeconds Int      @default(0)  // last saved playback position in seconds
}
```

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/channels` | Register a channel by URL. Calls YouTube API to resolve channel ID and metadata. |
| GET | `/api/channels/[id]/videos` | Fetch videos for a channel. First call syncs from YouTube API; subsequent calls return DB cache. |
| PATCH | `/api/videos/[id]/watched` | Toggle watched status. Sets `watched` and `watchedAt`. |
| PATCH | `/api/videos/[id]/progress` | Save playback position (called every 5s). Auto-marks watched when progress ≥ 95%. |

## YouTube API Usage

- **Channel registration:** `channels` endpoint (`part=snippet`, by `forHandle` or `id`) — ~3 units
- **Video fetch (initial):** `playlistItems` endpoint on uploads playlist, paginated — ~3 units per page (50 videos/page)
- **Re-sync:** Not automatic. User can trigger a manual refresh button to fetch newly uploaded videos.

## File Structure

```
app/
  page.tsx                          # Home: channel list + register form
  channels/[channelId]/
    page.tsx                        # Video list page
  api/
    channels/
      route.ts                      # POST: register channel
    channels/[id]/videos/
      route.ts                      # GET: fetch/sync videos
    videos/[id]/watched/
      route.ts                      # PATCH: toggle watched

components/
  ChannelCard.tsx                   # Channel card for home page
  VideoCard.tsx                     # Video card (thumbnail + progress bar + status badge)
  VideoFilter.tsx                   # Filter/search bar
  YoutubePlayer.tsx                 # IFrame Player wrapper with auto-save progress logic

lib/
  youtube.ts                        # YouTube API client (API key from env)
  prisma.ts                         # Prisma singleton client

prisma/
  schema.prisma
  dev.db                            # SQLite file (gitignored)
```

## Environment Variables

```
YOUTUBE_API_KEY=...   # Google Cloud API key with YouTube Data API v3 enabled
DATABASE_URL=file:./dev.db   # SQLite (swap for postgresql://... on AWS)
```

## Future Extensibility

- **Auth:** Add `userId` column to `Channel` table; wrap API routes with Cognito JWT verification
- **Deployment:** Change `DATABASE_URL` to RDS PostgreSQL connection string; Prisma handles the rest
