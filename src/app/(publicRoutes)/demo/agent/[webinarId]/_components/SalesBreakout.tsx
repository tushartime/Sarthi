'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { WebinarWithPresenter } from '@/lib/type'

/** Instance from `MicVAD.new` — typed narrowly so we don’t static-import vad-web (pulls onnxruntime). */
type VadHandle = {
  start: () => void
  pause: () => void
  destroy: () => void
}

type Msg = { role: 'user' | 'agent'; text: string }

function floatTo16BitPCM(float32: Float32Array) {
  const out = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function encodeWavPCM16(samples: Float32Array, sampleRate = 16000) {
  const pcm = floatTo16BitPCM(samples)
  const bytesPerSample = 2
  const blockAlign = bytesPerSample
  const buffer = new ArrayBuffer(44 + pcm.length * bytesPerSample)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + pcm.length * bytesPerSample, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true) // bits
  writeString(36, 'data')
  view.setUint32(40, pcm.length * bytesPerSample, true)

  let offset = 44
  for (let i = 0; i < pcm.length; i++, offset += 2) view.setInt16(offset, pcm[i], true)

  return buffer
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBlobUrl(base64: string, contentType: string) {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: contentType })
  return URL.createObjectURL(blob)
}

type Props = {
  webinar: WebinarWithPresenter
}

export default function SalesBreakout({ webinar }: Props) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [muted, setMuted] = useState(false)
  const [viewerName, setViewerName] = useState('')
  const [viewerEmail, setViewerEmail] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'agent',
      text: `Hi — I’m your sales agent for "${webinar.title}". Tell me what you’re trying to achieve, and I’ll show you why this is worth it (and what next step makes sense).`,
    },
  ])

  const vadRef = useRef<VadHandle | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastBlobUrlRef = useRef<string | null>(null)

  const agentInfo = useMemo(
    () => ({
      productName: webinar.title,
      pitch: webinar.description || '',
    }),
    [webinar.title, webinar.description],
  )

  const cleanupAudioUrl = () => {
    if (lastBlobUrlRef.current) {
      URL.revokeObjectURL(lastBlobUrlRef.current)
      lastBlobUrlRef.current = null
    }
  }

  const saveLead = async (status: 'INTERESTED' | 'FOLLOW_UP', reason?: string) => {
    if (!viewerEmail || !viewerName) return
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: viewerEmail,
        name: viewerName,
        webinarId: webinar.id,
        status,
        reason,
      }),
    }).catch(() => {})
  }

  const playAudio = async (base64: string, contentType: string) => {
    cleanupAudioUrl()
    const url = base64ToBlobUrl(base64, contentType)
    lastBlobUrlRef.current = url
    if (!audioRef.current) return
    audioRef.current.src = url
    try {
      await audioRef.current.play()
    } catch {
      // user gesture may be required; ignore
    }
  }

  const sendUtterance = async (audioFloat32: Float32Array) => {
    if (muted) return

    setStatus('thinking')
    const wav = encodeWavPCM16(audioFloat32, 16000)
    const audioWavBase64 = arrayBufferToBase64(wav)

    const res = await fetch('/api/demo-agent/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webinarId: webinar.id,
        audioWavBase64,
        agentInfo,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus('idle')
      setMsgs((m) => [
        ...m,
        { role: 'agent', text: data.error || 'Could not understand. Try again.' },
      ])
      return
    }

    setMsgs((m) => [
      ...m,
      { role: 'user', text: data.transcript || '(speech)' },
      { role: 'agent', text: data.replyText || '' },
    ])

    // Tag leads based on agent outcome
    if (data.coldLead) {
      await saveLead('FOLLOW_UP', data.coldLeadReason || 'Rejected after discount')
    } else {
      await saveLead('INTERESTED')
    }

    if (data.audioBase64) {
      setStatus('speaking')
      await playAudio(data.audioBase64, data.contentType || 'audio/wav')
    }
    setStatus('idle')
  }

  const start = async () => {
    if (!viewerEmail || !viewerName) {
      alert('Please enter your name and email first.')
      return
    }
    if (vadRef.current) return
    setStatus('listening')
    const { MicVAD } = await import('@ricky0123/vad-web')
    const vad = await MicVAD.new({
      baseAssetPath:
        'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/',
      onnxWASMBasePath:
        'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/',
      onSpeechEnd: (audio) => {
        // audio is Float32Array at 16000Hz
        sendUtterance(audio)
      },
    })
    vadRef.current = vad
    vad.start()
  }

  const end = async () => {
    setStatus('idle')
    try {
      vadRef.current?.pause()
    } catch {}
    try {
      vadRef.current?.destroy()
    } catch {}
    vadRef.current = null
    cleanupAudioUrl()
  }

  useEffect(() => {
    return () => {
      end()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex w-full flex-1 flex-col gap-4 rounded-lg border border-neutral-900 bg-neutral-950 p-4">
      <div className="flex flex-col gap-3 border-b border-neutral-900 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Sales breakout
          </p>
          <p className="text-xs text-neutral-300">
            Status:{' '}
            <span className="font-medium text-neutral-100">
              {status === 'thinking'
                ? 'Live negotiating…'
                : status === 'listening'
                  ? 'Listening…'
                  : status === 'speaking'
                    ? 'Talking…'
                    : 'Idle'}
            </span>
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-2 md:max-w-sm md:flex-row md:items-center">
          <input
            value={viewerName}
            onChange={(e) => setViewerName(e.target.value)}
            placeholder="Your name"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-[11px] text-white outline-none focus:border-neutral-500"
          />
          <input
            value={viewerEmail}
            onChange={(e) => setViewerEmail(e.target.value)}
            placeholder="Your email"
            type="email"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-[11px] text-white outline-none focus:border-neutral-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-1 md:pt-0">
          <button
            className="rounded-md border border-neutral-800 px-3 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
            onClick={() => setMuted((m) => !m)}
            type="button"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            className="rounded-md bg-white px-3 py-1 text-[11px] font-medium text-black hover:bg-neutral-100"
            onClick={() => start()}
            type="button"
          >
            Talk
          </button>
          <button
            className="rounded-md border border-neutral-800 px-3 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
            onClick={() => end()}
            type="button"
          >
            End call
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-md border border-neutral-900 bg-black/30 p-3 text-[12px]">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-md px-3 py-2 ${
              m.role === 'agent'
                ? 'bg-neutral-900 text-neutral-100'
                : 'ml-auto bg-neutral-800 text-neutral-100'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setStatus('speaking')}
        onEnded={() => setStatus('idle')}
        controls
        className="mt-2 w-full max-w-xs rounded-md border border-neutral-800 bg-black/40"
      />
    </div>
  )
}

