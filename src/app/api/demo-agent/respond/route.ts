import { NextResponse } from 'next/server'
import { prismaClient } from '@/lib/prismaClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type Body = {
  webinarId: string
  audioWavBase64: string
}

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text'
const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions'
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing SARVAM_API_KEY' }, { status: 500 })
    }

    const body = (await req.json()) as Body
    if (!body?.webinarId || !body?.audioWavBase64) {
      return NextResponse.json({ error: 'Missing webinarId or audio' }, { status: 400 })
    }

    const webinar = await prismaClient.webinar.findUnique({
      where: { id: body.webinarId },
      include: {
        presenter: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            stripeConnectId: true,
          },
        },
      },
    })

    if (!webinar) {
      return NextResponse.json({ error: 'Webinar not found' }, { status: 404 })
    }

    // 1) STT (Saaras v3)
    const audioBuf = Buffer.from(body.audioWavBase64, 'base64')
    const form = new FormData()
    form.set('model', 'saaras:v3')
    form.set('mode', 'transcribe')
    form.set('language_code', 'en-IN')
    form.set('file', new Blob([audioBuf], { type: 'audio/wav' }), 'speech.wav')

    const sttRes = await fetch(SARVAM_STT_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: form,
    })

    const sttJson = await sttRes.json().catch(() => ({}))
    if (!sttRes.ok) {
      return NextResponse.json(
        { error: 'STT failed', details: sttJson },
        { status: 500 },
      )
    }

    const transcript: string =
      sttJson?.transcript || sttJson?.data?.transcript || sttJson?.text || ''

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: 'No speech detected. Try again.' },
        { status: 400 },
      )
    }

    // 2) LLM (Sarvam-30B)
    const systemPrompt = `You are a concise, high-performing sales agent inside a webinar breakout room.

You are selling this product:
Product name: ${webinar.title}
Product pitch: ${webinar.description || 'No description provided.'}

Goals:
- Clearly explain the value and outcomes of this product for the specific user.
- Proactively move the user toward a decision (buy / book a call), not just answer questions.

Rules:
- Keep responses short, conversational, and helpful.
- Ask at most ONE focused question per turn that moves the sale forward.
- DO NOT ask to "show a demo" or "give a tour" – assume the video demo is already playing.
- If the user mentions price as a concern, offer a one-time 10% discount and explain why it is still worth it.
- If the user still refuses after the discount, politely ask if you can follow up later by email and then output a final line exactly: "LEAD_STATUS:COLD" with a short reason.
`

    const chatRes = await fetch(SARVAM_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sarvam-30b',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
      }),
    })

    const chatJson = await chatRes.json().catch(() => ({}))
    if (!chatRes.ok) {
      return NextResponse.json(
        { error: 'LLM failed', details: chatJson },
        { status: 500 },
      )
    }

    const replyTextRaw: string =
      chatJson?.choices?.[0]?.message?.content ||
      chatJson?.output_text ||
      ''

    const [replyText, leadSignal] = replyTextRaw.split('LEAD_STATUS:COLD')
    const isColdLead = replyTextRaw.includes('LEAD_STATUS:COLD')
    const leadReason = isColdLead ? leadSignal?.trim().slice(0, 250) : null

    // 3) TTS (Bulbul v3)
    const ttsRes = await fetch(SARVAM_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model: 'bulbul:v3',
        speaker: 'shreya',
        target_language_code: 'en-IN',
        text: (replyText || '').trim().slice(0, 2400),
      }),
    })

    const ttsJson = await ttsRes.json().catch(() => ({}))
    if (!ttsRes.ok) {
      return NextResponse.json(
        { error: 'TTS failed', details: ttsJson },
        { status: 500 },
      )
    }

    const audioBase64: string =
      ttsJson?.audios?.[0] || ttsJson?.audio || ttsJson?.data?.audio || ''
    const contentType = 'audio/wav'

    return NextResponse.json({
      transcript,
      replyText: (replyText || '').trim(),
      audioBase64,
      contentType,
      coldLead: isColdLead,
      coldLeadReason: leadReason,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 })
  }
}

