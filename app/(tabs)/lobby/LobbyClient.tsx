'use client'

import { useState } from 'react'
import {
  IconSwords,
  IconUserPlus,
  IconClockHour4,
} from '@tabler/icons-react'
import { MatchmakeClient } from './MatchmakeClient'

export function LobbyClient() {
  const [matchmakeOpen, setMatchmakeOpen] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setMatchmakeOpen(true)}
          className="flex items-center gap-4 rounded-2xl border border-[#5B2AF3]/40 bg-[#5B2AF3]/20 px-5 py-4 text-left transition-colors hover:bg-[#5B2AF3]/30 active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5B2AF3]/40 text-[#9474F6]">
            <IconSwords size={20} />
          </span>
          <div className="flex flex-col">
            <span
              className="font-bold text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Jugar partida nueva
            </span>
            <span className="text-xs text-white/50">Busca rival de tu nivel</span>
          </div>
        </button>

        <button
          onClick={() => setChallengeOpen(true)}
          className="flex items-center gap-4 rounded-2xl border border-[#5B2AF3]/40 bg-[#5B2AF3]/20 px-5 py-4 text-left transition-colors hover:bg-[#5B2AF3]/30 active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5B2AF3]/40 text-[#9474F6]">
            <IconUserPlus size={20} />
          </span>
          <div className="flex flex-col">
            <span
              className="font-bold text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Retar a un amigo
            </span>
            <span className="text-xs text-white/50">Invita por email o usuario</span>
          </div>
        </button>

        <a
          href="/matches"
          className="flex items-center gap-4 rounded-2xl border border-[#5B2AF3]/40 bg-[#5B2AF3]/20 px-5 py-4 transition-colors hover:bg-[#5B2AF3]/30 active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5B2AF3]/40 text-[#9474F6]">
            <IconClockHour4 size={20} />
          </span>
          <div className="flex flex-col">
            <span
              className="font-bold text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Mis partidas activas
            </span>
            <span className="text-xs text-white/50">Ver tus partidas en curso</span>
          </div>
        </a>
      </div>

      {matchmakeOpen && (
        <MatchmakeClient onClose={() => setMatchmakeOpen(false)} />
      )}

      {challengeOpen && (
        <MatchmakeClient onClose={() => setChallengeOpen(false)} />
      )}
    </>
  )
}
