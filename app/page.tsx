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
