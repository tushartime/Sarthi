'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const DemoCreator = () => {
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [liveUrl, setLiveUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setLiveUrl(null)

      const res = await fetch('/api/demo-webinar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Demo conversation room',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      const data = (await res.json()) as { liveUrl: string }
      setLiveUrl(data.liveUrl)

      try {
        await navigator.clipboard.writeText(data.liveUrl)
      } catch {
        // ignore clipboard errors
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create demo room')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-300">
          Give this demo a short name
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Product tour with AI breakout"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
        />
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full justify-center gap-2 bg-white text-black hover:bg-neutral-100"
        disabled={isLoading}
        onClick={handleCreate}
      >
        {isLoading ? 'Creating demo room…' : 'Create demo webinar link'}
        {!isLoading && <ArrowRight className="h-3 w-3" />}
      </Button>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {liveUrl && (
        <div className="space-y-1 text-[11px] text-neutral-400">
          <p>
            Link created. It&apos;s copied to your clipboard — you can also open it directly:
          </p>
          <Link
            href={liveUrl}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-100 underline underline-offset-4"
          >
            Open demo room
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

