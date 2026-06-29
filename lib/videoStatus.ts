export type VideoStatus = 'unwatched' | 'inProgress' | 'watched'

export interface VideoStatusInput {
  watched: boolean
  progressSeconds: number
}

export function videoStatus(v: VideoStatusInput): VideoStatus {
  if (v.watched) return 'watched'
  if (v.progressSeconds > 0) return 'inProgress'
  return 'unwatched'
}

export function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export type VideoKind = 'short' | 'long' | 'unknown'

// Shorts are up to 3 minutes. We also treat a "#shorts" hashtag in the title as
// a definitive signal (covers anything tagged).
export const SHORT_MAX_SECONDS = 180
const SHORT_HASHTAG = /#shorts?\b/i

export function videoKind(duration: number | null, title = ''): VideoKind {
  if (SHORT_HASHTAG.test(title)) return 'short'
  if (duration == null) return 'unknown'
  return duration <= SHORT_MAX_SECONDS ? 'short' : 'long'
}
