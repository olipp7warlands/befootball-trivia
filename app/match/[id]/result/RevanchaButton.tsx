'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconRefresh } from '@tabler/icons-react'
import { createMatch } from '@/app/actions/matches'

interface Props {
  opponentId: string | null
  opponentUsername: string | null
}

export default function RevanchaButton({ opponentId, opponentUsername }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRevancha() {
    if (!opponentUsername && !opponentId) return
    setLoading(true)
    setError(null)
    try {
      const { matchId, error: matchError } = await createMatch(
        opponentUsername ?? opponentId ?? undefined
      )
      if (matchError || !matchId) {
        setError(matchError ?? 'Error al crear la revancha')
        return
      }
      router.push(`/match/${matchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleRevancha}
        disabled={loading || (!opponentUsername && !opponentId)}
        className="btn-primary justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconRefresh size={18} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Creando revancha…' : 'Revancha'}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
