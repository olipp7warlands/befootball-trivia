'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  matchId: string
  winnerName: string
}

export default function ShareActions({ winnerName }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const shareData = {
      title: 'Gané en Befootball Trivia',
      text: `${winnerName} ganó en Befootball World Cup Trivia. ¿Puedes superarme?`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or share failed — silently ignore
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard not available
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="btn-primary w-full justify-center"
      >
        {copied ? 'Enlace copiado ✓' : 'Compartir'}
        {!copied && <span className="arrow-badge">↗</span>}
      </button>

      <Link href="/lobby" className="btn-primary w-full justify-center" style={{ background: 'rgba(91,42,243,0.25)', border: '1px solid rgba(91,42,243,0.5)' }}>
        Reta a un amigo
        <span className="arrow-badge">↗</span>
      </Link>
    </>
  )
}
