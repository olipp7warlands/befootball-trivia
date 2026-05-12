'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  previousMatchId: string
}

export default function RevanchaButton({ previousMatchId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRematch() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/match/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousMatchId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo crear la revancha')
        return
      }
      router.push(`/match/${data.matchId}`)
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <button
        onClick={handleRematch}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '13px 16px',
          borderRadius: '9999px',
          border: '1px solid rgba(148,116,246,0.4)',
          background: loading ? 'transparent' : 'rgba(91,42,243,0.12)',
          color: loading ? 'rgba(222,216,250,0.4)' : '#9474F6',
          fontFamily: 'var(--font-body)',
          fontWeight: 800,
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{loading ? 'Preparando...' : 'Revancha'}</span>
        {!loading && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '9999px',
              background: 'rgba(148,116,246,0.2)',
              color: '#9474F6',
              fontSize: '14px',
            }}
          >
            ↺
          </span>
        )}
      </button>

      {error && (
        <p
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(220,53,69,0.3)',
            background: 'rgba(220,53,69,0.1)',
            fontSize: '11px',
            color: '#dc3545',
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
