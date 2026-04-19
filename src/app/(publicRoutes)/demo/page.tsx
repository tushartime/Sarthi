import Link from 'next/link'
import { ArrowRight, MessageCircle, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DemoCreator } from './_components/DemoCreator'

const demoSteps = [
  {
    title: '1. Start a conversation-first “webinar”',
    subtitle: 'Pick a topic and intent',
    copy: 'Describe what you want to sell and who you want in the room. Sarthi turns this into a conversation-first webinar, not a one-way broadcast.',
    badge: 'Setup',
  },
  {
    title: '2. Spin up an AI breakout room',
    subtitle: 'Let the agent do the first pass',
    copy: 'Behind the scenes, Sarthi creates an AI breakout room that can greet visitors, qualify intent, and keep them talking while you stay in control.',
    badge: 'AI room',
  },
  {
    title: '3. Capture and surface real leads',
    subtitle: 'Only see the conversations that matter',
    copy: 'As people interact, Sarthi scores conversations, pulls out key signals, and turns them into a short lead list you can act on immediately.',
    badge: 'Leads',
  },
] as const

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800 px-6 py-4 lg:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700">
              <span className="text-sm font-semibold tracking-tight">S</span>
            </div>
            <span className="text-lg font-medium tracking-tight">Sarthi</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600">
              Demo
            </span>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-neutral-700 bg-transparent px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-900 hover:text-white"
          >
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 lg:gap-12 lg:py-14">
        {/* Hero */}
        <section className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
            Demo · No sign-in needed
          </p>
          <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            See how Sarthi turns a simple idea
            <br className="hidden sm:block" />
            <span className="font-normal"> into conversations, rooms, and leads.</span>
          </h1>
          <p className="max-w-xl text-sm text-neutral-400">
            This is a guided demo. We&apos;ll walk through creating a conversation-first webinar,
            spinning up an AI breakout room, and surfacing a short, actionable lead list.
          </p>
        </section>

        {/* Demo cards (simulated flow) */}
        <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6">
          <Card className="border-neutral-800 bg-neutral-950">
            <CardContent className="flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1">
                  <MessageCircle className="h-3 w-3 text-neutral-400" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                    Live demo room
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Spin up a shareable demo webinar link
                  </h2>
                  <p className="text-sm text-neutral-400">
                    We&apos;ll create a real webinar record and a live room URL you can open and share
                    without signing in.
                  </p>
                </div>
              </div>

              <DemoCreator />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {demoSteps.map((step) => (
              <Card key={step.title} className="border-neutral-800 bg-neutral-950">
                <CardContent className="flex gap-3 p-4 sm:p-5">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800">
                    {step.badge === 'Setup' && (
                      <MessageCircle className="h-4 w-4 text-neutral-300" />
                    )}
                    {step.badge === 'AI room' && (
                      <Sparkles className="h-4 w-4 text-neutral-300" />
                    )}
                    {step.badge === 'Leads' && <Users className="h-4 w-4 text-neutral-300" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                        {step.badge}
                      </p>
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-50 sm:text-base">
                      {step.title}
                    </h3>
                    <p className="text-xs font-medium text-neutral-400">{step.subtitle}</p>
                    <p className="pt-1 text-xs text-neutral-400">{step.copy}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-2 flex flex-col items-start justify-between gap-4 border-t border-neutral-900 pt-6 text-sm text-neutral-400 sm:flex-row sm:items-center">
          <p>
            Want to see this wired up to your own conversations?{' '}
            <span className="text-neutral-200">You&apos;ll just need an account.</span>
          </p>
          <Button
            asChild
            size="sm"
            className="px-4 text-xs font-medium bg-white text-black hover:bg-neutral-100"
          >
            <Link href="/sign-in">
              Continue to full product
              <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  )
}

