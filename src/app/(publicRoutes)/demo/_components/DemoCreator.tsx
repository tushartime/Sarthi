'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DEMO_PRODUCT_DEFAULT_DESCRIPTION,
  DEMO_PRODUCT_DEFAULT_TITLE,
} from '@/lib/demo-product'

export const DemoCreator = () => {
  const [title, setTitle] = useState(DEMO_PRODUCT_DEFAULT_TITLE)
  const [description, setDescription] = useState(DEMO_PRODUCT_DEFAULT_DESCRIPTION)
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
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      const data = (await res.json()) as { liveUrl: string }
      setLiveUrl(data.liveUrl)

      try {
        const origin =
          typeof window !== 'undefined' ? window.location.origin : ''
        await navigator.clipboard.writeText(origin + data.liveUrl)
      } catch {
        // ignore clipboard errors
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create demo room')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-300">
          Product / offer name
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you selling in this demo?"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-300">
          Description (the AI agent reads this)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={10}
          className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-neutral-500"
        />
        <p className="text-[10px] text-neutral-500">
          We pre-filled a strong example—you can edit it or replace it with your own offer.
        </p>
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
