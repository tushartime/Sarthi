"use client"

import Link from 'next/link'
import { WebinarWithPresenter } from '@/lib/type'

type Props = {
  webinar: WebinarWithPresenter
}

const DemoVideoView = ({ webinar }: Props) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4 py-10 text-white">
      <div className="flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
          <video src="/demo.mp4" controls className="h-full w-full object-cover" />
        </div>
        <div className="flex w-full max-w-sm flex-col justify-between gap-4 text-sm text-neutral-300">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Demo · Conversation-led sales
            </p>
            <h1 className="text-lg font-semibold tracking-tight">{webinar.title}</h1>
            <p className="text-xs leading-relaxed text-neutral-400">
              {webinar.description ??
                'This is a demo conversation room where an AI breakout assistant greets visitors, learns what they care about, and nudges them toward your call-to-action.'}
            </p>
          </div>

          <div className="space-y-2 text-[11px] text-neutral-400">
            <p>
              Want to feel how an AI breakout room would actually sell this to you? Jump into a
              separate, focused agent view.
            </p>
            <Link
              href={`/demo/agent/${webinar.id}`}
              className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-[11px] font-medium text-black hover:bg-neutral-100"
            >
              Talk to the AI agent
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DemoVideoView

