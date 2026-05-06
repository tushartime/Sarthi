import { NextResponse } from 'next/server'
import { prismaClient } from '@/lib/prismaClient'
import { AttendedTypeEnum } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { attendeeId, webinarId } = body as {
      attendeeId?: string
      webinarId?: string
    }

    if (!attendeeId) {
      return NextResponse.json({ error: 'Missing attendeeId' }, { status: 400 })
    }

    let finalWebinarId = webinarId

    if (!finalWebinarId) {
      const latestAttendance = await prismaClient.attendance.findFirst({
        where: { attendeeId },
        orderBy: { joinedAt: 'desc' },
        select: { webinarId: true },
      })
      finalWebinarId = latestAttendance?.webinarId
    }

    if (!finalWebinarId) {
      return NextResponse.json(
        { error: 'No webinar attendance found for this attendee' },
        { status: 404 },
      )
    }

    await prismaClient.attendance.upsert({
      where: { attendeeId_webinarId: { attendeeId, webinarId: finalWebinarId } },
      update: { attendedType: AttendedTypeEnum.FOLLOW_UP },
      create: {
        attendeeId,
        webinarId: finalWebinarId,
        attendedType: AttendedTypeEnum.FOLLOW_UP,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to trigger manual follow up' },
      { status: 500 },
    )
  }
}
