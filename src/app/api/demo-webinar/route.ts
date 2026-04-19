import { NextResponse } from 'next/server'
import { prismaClient } from '@/lib/prismaClient'
import { CtaTypeEnum, WebinarStatusEnum } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { title, description } = body as {
      title?: string
      description?: string
    }

    // Ensure we always have a demo presenter user, without requiring Clerk/auth
    const demoClerkId = 'demo-presenter'

    const presenter = await prismaClient.user.upsert({
      where: { clerkId: demoClerkId },
      update: {},
      create: {
        clerkId: demoClerkId,
        email: 'demo-presenter@sarthi.demo',
        name: 'Sarthi Demo Presenter',
        profileImage: 'https://dummyimage.com/80x80/111/fff&text=S',
      },
    })

    const now = new Date()

    const webinar = await prismaClient.webinar.create({
      data: {
        title: title?.trim() || 'AI breakout room demo',
        description:
          description?.trim() ||
          'This is a demo conversation-led sales room. The AI breakout assistant welcomes visitors, learns what they care about, and guides them toward booking a call.',
        startTime: now,
        webinarStatus: WebinarStatusEnum.LIVE,
        tags: ['demo'],
        ctaLabel: 'Book a call',
        ctaType: CtaTypeEnum.BOOK_A_CALL,
        aiAgentId: null,
        priceId: null,
        lockChat: false,
        couponCode: null,
        couponEnabled: false,
        presenterId: presenter.id,
      },
    })

    const liveUrl = `/live-webinar/${webinar.id}`

    return NextResponse.json(
      {
        success: true,
        webinarId: webinar.id,
        liveUrl,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Demo webinar creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create demo webinar' },
      { status: 500 },
    )
  }
}


