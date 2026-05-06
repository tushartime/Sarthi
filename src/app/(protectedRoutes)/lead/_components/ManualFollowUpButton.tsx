'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Props = {
  attendeeId: string
  webinarId?: string
}

export default function ManualFollowUpButton({ attendeeId, webinarId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const triggerFollowUp = async () => {
    if (loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/leads/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeId, webinarId }),
      })

      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={triggerFollowUp}
      className="h-8"
    >
      {loading ? 'Adding...' : 'Manual Follow Up'}
    </Button>
  )
}
