import { Waitlist } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Simple nav */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-10 border-b border-neutral-800">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700">
            <span className="text-sm font-semibold tracking-tight">S</span>
          </div>
          <span className="text-lg font-medium tracking-tight">Sarthi</span>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-neutral-700 bg-transparent text-sm font-medium text-neutral-100 hover:bg-neutral-900 hover:text-white"
        >
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </nav>

      <main className="container mx-auto flex min-h-[calc(100vh-6rem)] flex-col gap-16 px-6 py-12 lg:px-10 lg:py-20">
        {/* Section 1: Simple hero */}
        <section className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
            Conversation-led sales
          </p>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Automate the boring parts of
            <br className="hidden sm:block" />
            <span className="font-normal"> every customer conversation.</span>
          </h1>

          <p className="text-sm text-neutral-400 sm:text-base">
            Sarthi turns sign-ups into ongoing, guided chats—follow‑ups, nudges, and hand‑offs to your
            team—without you having to orchestrate every step.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              asChild
              size="lg"
              className="px-7 text-sm font-medium bg-white text-black hover:bg-neutral-100"
            >
              <Link href="/sign-in">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-neutral-700 bg-transparent px-7 text-sm font-medium text-neutral-100 hover:bg-neutral-900 hover:text-white"
            >
              <Link href="/demo">Watch demo</Link>
            </Button>
            <Link
              href="#waitlist-section"
              className="text-xs font-medium text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
            >
              Join the waitlist
            </Link>
          </div>
        </section>

        {/* Section 2: Waitlist / single focus card */}
        <section
          id="waitlist-section"
          className="mx-auto flex w-full max-w-3xl flex-1 items-center"
        >
          <Card className="w-full border-neutral-800 bg-neutral-950">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="mb-6 space-y-2 text-center">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Join the early access waitlist
                </h2>
                <p className="text-xs text-neutral-400 sm:text-sm">
                  Leave your email to get early access and occasional product updates.
                </p>
              </div>

              <div className="mx-auto max-w-md">
                <Waitlist />
              </div>

              <div className="mt-6 space-y-1 text-center text-[11px] text-neutral-500">
                <p>We only email when there&apos;s something useful. Unsubscribe anytime.</p>
                <p>
                  Already using Sarthi?{' '}
                  <Link href="/sign-in" className="underline underline-offset-4 hover:text-gray-200">
                    Sign in here
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

