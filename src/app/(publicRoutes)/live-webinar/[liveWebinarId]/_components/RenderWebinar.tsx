'use client'
import React, { useEffect } from 'react'
import { User, WebinarStatusEnum } from '@prisma/client'
import WebinarUpcomingState from './UpcomingWebinar/WebinarUpcomingState'
import { usePathname, useRouter } from 'next/navigation'
import { useAttendeeStore } from '@/store/useAttendeeStore'
import { toast } from 'sonner'
import LiveStreamState from './LiveWebinar/LiveStreamState'
import DemoVideoView from './Common/DemoVideoView'
import { WebinarWithPresenter } from '@/lib/type'

type Props = {
  error: string | undefined
  user: User | null
  webinar: WebinarWithPresenter
  apiKey: string
  token: string
  callId: string
}

const RenderWebinar = ({ error, user, webinar, apiKey, token, callId }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const { attendee } = useAttendeeStore()

  const isDemo = webinar.tags?.includes('demo')

  useEffect(() => {
    if (error) {
      toast.error(error)
      router.push(pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  if (webinar.webinarStatus === WebinarStatusEnum.CANCELLED) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <h3 className="text-2xl font-semibold text-primary">{webinar.title}</h3>
          <p className="text-xs text-muted-foreground">This webinar has been cancelled.</p>
        </div>
      </div>
    )
  }

  // For demo webinars: always show the demo video view, no auth required
  if (isDemo && webinar.webinarStatus === WebinarStatusEnum.LIVE) {
    return <DemoVideoView webinar={webinar} />
  }

  return (
    <>
      {webinar.webinarStatus === WebinarStatusEnum.SCHEDULED ? (
        <WebinarUpcomingState webinar={webinar} currentUser={user || null} />
      ) : webinar.webinarStatus === WebinarStatusEnum.WAITING_ROOM ? (
        <WebinarUpcomingState webinar={webinar} currentUser={user || null} />
      ) : webinar.webinarStatus === WebinarStatusEnum.LIVE ? (
        <>
          {user?.id === webinar.presenterId ? (
            <LiveStreamState apiKey={apiKey} token={token} callId={callId} webinar={webinar} user={user} />
          ) : attendee ? (
            <WebinarUpcomingState webinar={webinar} currentUser={user || null} />
          ) : (
            <WebinarUpcomingState webinar={webinar} currentUser={user || null} />
          )}
        </>
      ) : (
        <WebinarUpcomingState webinar={webinar} currentUser={user || null} />
      )}
    </>
  )
}

export default RenderWebinar
