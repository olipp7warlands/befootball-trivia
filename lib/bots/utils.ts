// Pure utility functions — no DB, fully testable

const NUM_TOKENS = ['07', '10', '11', '17', '19', '22', '27', '82', '91', '94', '99', '03']

/** Box-Muller Gaussian sample */
export function gaussianSample(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2)
  return mean + z * std
}

/** Gaussian ELO near userElo ±80, clipped to [800, 2200] */
export function gaussianElo(userElo: number): number {
  return Math.round(Math.min(2200, Math.max(800, gaussianSample(userElo, 80))))
}

export function getDivision(elo: number): string {
  if (elo < 1100) return 'bronze'
  if (elo < 1300) return 'silver'
  if (elo < 1500) return 'gold'
  if (elo < 1800) return 'diamond'
  return 'elite'
}

const SKILL_RANGES: Record<string, [number, number]> = {
  bronze:  [0.45, 0.55],
  silver:  [0.55, 0.65],
  gold:    [0.65, 0.75],
  diamond: [0.75, 0.85],
  elite:   [0.85, 0.95],
}

export function getBotSkill(division: string): number {
  const [min, max] = SKILL_RANGES[division] ?? [0.45, 0.55]
  return parseFloat((min + Math.random() * (max - min)).toFixed(2))
}

export function getBotResponseSpeed(): 'fast' | 'medium' | 'slow' {
  const r = Math.random()
  if (r < 0.30) return 'fast'
  if (r < 0.80) return 'medium'
  return 'slow'
}

export function resolveUsername(pattern: string, firstName: string, attempt = 0): string {
  const num = NUM_TOKENS[(Math.floor(Math.random() * NUM_TOKENS.length) + attempt) % NUM_TOKENS.length]
  const lastInit = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  return pattern
    .replace('{first}', firstName)
    .replace('{num}', num)
    .replace('{lastinit}', lastInit)
}

/** Weighted random pick from array where each item has a `weight` field */
export function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let rand = Math.random() * total
  for (const item of items) {
    rand -= item.weight
    if (rand <= 0) return item
  }
  return items[items.length - 1]
}
