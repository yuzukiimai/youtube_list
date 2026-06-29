import { VideoStatus } from '@/lib/videoStatus'

export type BadgeStatus = VideoStatus | 'playing'

const STYLES: Record<BadgeStatus, { label: string; className: string; dot: string }> = {
  unwatched: {
    label: '未視聴',
    className: 'bg-neutral-100 text-neutral-600',
    dot: 'bg-neutral-400',
  },
  inProgress: {
    label: '中断',
    className: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  watched: {
    label: '視聴済み',
    className: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  playing: {
    label: '再生中',
    className: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500 animate-pulse',
  },
}

export function StatusBadge({ status, suffix }: { status: BadgeStatus; suffix?: string }) {
  const s = STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}{suffix ? ` ${suffix}` : ''}
    </span>
  )
}
