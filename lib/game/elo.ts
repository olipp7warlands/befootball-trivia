import type { Division } from "../types"
import { DIVISION_ELO } from "../types"

export function getDivision(elo: number): Division {
  for (const [division, [min, max]] of Object.entries(DIVISION_ELO) as [Division, [number, number]][]) {
    if (elo >= min && elo <= max) return division
  }
  return "elite"
}

export function calcElo(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  drew: boolean
): number {
  const K = 32
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const result = won ? 1 : drew ? 0.5 : 0
  return Math.max(0, Math.floor(playerElo + K * (result - expected)))
}
