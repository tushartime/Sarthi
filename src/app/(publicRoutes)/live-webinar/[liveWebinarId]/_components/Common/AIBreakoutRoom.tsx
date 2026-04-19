"use client"

import { useEffect, useRef, useState } from 'react'
import type { WebinarWithPresenter } from '@/lib/type'

type Message = {
  from: 'user' | 'ai'
  text: string
}

type Props = {
  webinar: WebinarWithPresenter
}

const buildStarterPrompt = (webinar: WebinarWithPresenter): string => {
  const base =
    "Hi, I'm the Sarthi AI breakout assistant. I'm here to sell you on this conversation‑led offer in a normal, human way."
  const name = webinar.title ? ` It's called "${webinar.title}".` : ''
  const desc = webinar.description
    ? ` In simple terms, it's about: ${webinar.description}`
    : ''
  return `${base}${name}${desc} Tell me what you’re working on or what you want from this webinar, and I’ll show you how this could fit you.`
}

const buildSalesReply = (userText: string, webinar: WebinarWithPresenter): string => {
  const desc =
    webinar.description ??
    'a conversation‑led sales webinar that uses AI breakout rooms to talk to visitors 1:1 and nudge them toward your call‑to‑action.'

  return [
    `Thanks for sharing that. Based on what you said, this session is designed to help someone like you by focusing on ${desc}.`,
    `While you watch the main webinar, the AI breakout room can keep a 1:1 conversation going with you — answering questions in plain language, clarifying anything that’s confusing, and gently steering you toward the next step when it feels right.`,
    `If you tell me your situation in one sentence (for example: "I'm a founder trying to get more qualified demos"), I can outline how this webinar and the AI room would sell *specifically* to you.`,
  ].join(' ')
}

const AIBreakoutRoom = ({ webinar }: Props) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)

  useEffect(() => {
    setMessages([{ from: 'ai', text: buildStarterPrompt(webinar) }])

    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.continuous = true

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript as string
          handleSendText(transcript)
        }

        recognition.onend = () => {
          // If the user still expects us to listen, restart recognition
          if (isListeningRef.current) {
            try {
              recognition.start()
            } catch {
              setIsListening(false)
              isListeningRef.current = false
            }
          } else {
            setIsListening(false)
          }
        }

        recognitionRef.current = recognition
      }
    }
  }, [])

  const speak = (text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    synthRef.current.speak(utterance)
  }

  const handleSendText = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const nextMessages: Message[] = [...messages, { from: 'user', text: trimmed }]
    const aiReply = buildSalesReply(trimmed, webinar)

    const updated = [...nextMessages, { from: 'ai', text: aiReply }]
    setMessages(updated)
    setInput('')
    speak(aiReply)
  }

  const handleSend = () => {
    handleSendText(input)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      isListeningRef.current = false
      return
    }

    try {
      recognitionRef.current.start()
      setIsListening(true)
      isListeningRef.current = true
    } catch {
      setIsListening(false)
      isListeningRef.current = false
    }
  }

  return (
    <div className="flex h-full flex-col rounded-md border border-neutral-800 bg-neutral-950 p-3 text-[11px] text-neutral-100">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          AI breakout room · voice
        </div>
        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
            }`}
          />
          {isSpeaking ? 'Speaking…' : 'Idle'}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto rounded-md bg-neutral-950/80 p-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-md px-2 py-1.5 ${
              m.from === 'ai'
                ? 'bg-neutral-900 text-neutral-50'
                : 'ml-auto bg-neutral-800 text-neutral-100'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Describe your offer or ask a question…"
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-[11px] text-white outline-none focus:border-neutral-500"
        />
        <button
          type="button"
          onClick={toggleListening}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
          }`}
        >
          {isListening ? 'Stop' : 'Speak'}
        </button>
        <button
          type="button"
          onClick={handleSend}
          className="rounded-md bg-white px-3 py-1 text-[11px] font-medium text-black hover:bg-neutral-100"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default AIBreakoutRoom

