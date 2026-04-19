import { NextResponse } from 'next/server'
import { prismaClient } from '@/lib/prismaClient'
import { AttendedTypeEnum, CallStatusEnum } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, name, webinarId, status } = body as {
      email?: string
      name?: string
      webinarId?: string
      status?: string
    }

    if (!email || !name || !webinarId) {
      return NextResponse.json({ error: 'Missing email/name/webinarId' }, { status: 400 })
    }

    const attendee = await prismaClient.attendee.upsert({
      where: { email },
      update: { name },
      create: { email, name, callStatus: CallStatusEnum.PENDING },
    })

    const attendedType =
      status === 'INTERESTED'
        ? AttendedTypeEnum.BREAKOUT_ROOM
        : status === 'FOLLOW_UP'
          ? AttendedTypeEnum.FOLLOW_UP
          : AttendedTypeEnum.FOLLOW_UP

    await prismaClient.attendance.upsert({
      where: { attendeeId_webinarId: { attendeeId: attendee.id, webinarId } },
      update: { attendedType },
      create: {
        attendeeId: attendee.id,
        webinarId,
        attendedType,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}

