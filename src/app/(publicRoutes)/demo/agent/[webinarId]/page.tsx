import { getWebinarById } from '@/actions/webinar'
import SalesBreakout from './_components/SalesBreakout'

type Props = {
  params: Promise<{
    webinarId: string
  }>
}

const AgentDemoPage = async ({ params }: Props) => {
  const { webinarId } = await params
  const webinar = await getWebinarById(webinarId)

  if (!webinar) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
        <p className="text-sm text-neutral-400">Demo webinar not found.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-black text-white">
      <header className="border-b border-neutral-900 px-6 py-3 text-xs text-neutral-400">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              AI breakout agent
            </p>
            <p className="text-sm text-neutral-200">{webinar.title}</p>
          </div>
          <a
            href={`/live-webinar/${webinar.id}`}
            className="rounded-md border border-neutral-800 px-3 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
          >
            Back to demo video
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6">
        <div className="mb-3 text-[11px] text-neutral-400">
          This space is focused purely on conversation. The agent will use the webinar description to
          explain who the product is for, why it matters, and what next step makes sense for you.
        </div>
        <SalesBreakout webinar={webinar} />
      </main>
    </div>
  )
}

export default AgentDemoPage

