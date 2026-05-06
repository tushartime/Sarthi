import { NextResponse } from 'next/server'
import { prismaClient } from '@/lib/prismaClient'
import { AttendedTypeEnum, CallStatusEnum, LeadTypeEnum } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type ConversationMessage = {
  role?: 'user' | 'agent'
  text?: string
}

const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions'

const normalizeLeadType = (value?: string): LeadTypeEnum => {
  if (!value) return LeadTypeEnum.UNKNOWN
  const parsed = value.trim().toUpperCase()
  if (parsed === LeadTypeEnum.HOT) return LeadTypeEnum.HOT
  if (parsed === LeadTypeEnum.WARM) return LeadTypeEnum.WARM
  if (parsed === LeadTypeEnum.COLD) return LeadTypeEnum.COLD
  return LeadTypeEnum.UNKNOWN
}

const classifyLeadFromConversation = async (
  messages: ConversationMessage[],
) => {
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey || messages.length === 0) {
    return { leadType: LeadTypeEnum.UNKNOWN, leadReason: null as string | null }
  }

  const transcript = messages
    .filter((msg) => msg?.text?.trim())
    .slice(-20)
    .map((msg) => `${msg.role === 'agent' ? 'AGENT' : 'USER'}: ${msg.text}`)
    .join('\n')

  if (!transcript.trim()) {
    return { leadType: LeadTypeEnum.UNKNOWN, leadReason: null as string | null }
  }

  const systemPrompt = `You are a lead qualification assistant.
Classify the lead from the conversation transcript.
- HOT: ready to buy now / asks to pay or book immediately.
- WARM: interested, but needs follow-up/clarification before buying.
- COLD: not interested or explicitly rejects.
- UNKNOWN: insufficient information.

Return strict JSON only:
{"leadType":"HOT|WARM|COLD|UNKNOWN","reason":"short reason under 140 chars"}`

  const chatRes = await fetch(SARVAM_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sarvam-30b',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
    }),
  })

  if (!chatRes.ok) {
    return { leadType: LeadTypeEnum.UNKNOWN, leadReason: null as string | null }
  }

  const chatJson = await chatRes.json().catch(() => ({}))
  const raw =
    chatJson?.choices?.[0]?.message?.content ||
    chatJson?.output_text ||
    ''

  let parsed: { leadType?: string; reason?: string } = {}
  try {
    parsed = JSON.parse(raw)
  } catch {
    // fallback to UNKNOWN if model returned non-json
  }

  const leadType = normalizeLeadType(parsed.leadType)
  const leadReason = parsed.reason?.trim()
    ? parsed.reason.trim().slice(0, 140)
    : null

  return { leadType, leadReason }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, name, webinarId, status, reason, conversationEnded, conversation } = body as {
      email?: string
      name?: string
      webinarId?: string
      status?: string
      reason?: string
      conversationEnded?: boolean
      conversation?: ConversationMessage[]
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

    const aiClassification =
      conversationEnded && Array.isArray(conversation)
        ? await classifyLeadFromConversation(conversation)
        : null

    const fallbackLeadType =
      status === 'INTERESTED'
        ? LeadTypeEnum.WARM
        : status === 'FOLLOW_UP'
          ? LeadTypeEnum.COLD
          : LeadTypeEnum.UNKNOWN

    const finalLeadType = aiClassification?.leadType || fallbackLeadType
    const finalReason = aiClassification?.leadReason || reason || null
    const finalAttendedType =
      finalLeadType === LeadTypeEnum.WARM
        ? AttendedTypeEnum.FOLLOW_UP
        : attendedType

    await prismaClient.attendee.update({
      where: { id: attendee.id },
      data: {
        callStatus: conversationEnded ? CallStatusEnum.COMPLETED : CallStatusEnum.InProgress,
        leadType: finalLeadType,
        leadReason: finalReason,
        lastConversationAt: conversationEnded ? new Date() : undefined,
      },
    })

    await prismaClient.attendance.upsert({
      where: { attendeeId_webinarId: { attendeeId: attendee.id, webinarId } },
      update: { attendedType: finalAttendedType },
      create: {
        attendeeId: attendee.id,
        webinarId,
        attendedType: finalAttendedType,
      },
    })

    return NextResponse.json({
      success: true,
      attendeeId: attendee.id,
      leadType: finalLeadType,
      leadReason: finalReason,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}

