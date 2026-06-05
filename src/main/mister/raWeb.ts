import { RaSummary, RaGameProgress } from '@shared/types'

interface RawRecent { GameID: number; Title: string; ConsoleName: string; ImageIcon?: string }
interface RawSummary {
  TotalPoints?: number
  TotalSoftcorePoints?: number
  Rank?: number
  TotalRanked?: number
  RecentlyPlayed?: RawRecent[]
  Awarded?: Record<string, { NumAchieved?: number; NumPossibleAchievements?: number }>
}

const RA_BASE = 'https://retroachievements.org'

export class RaWebClient {
  constructor(
    private username: string,
    private apiKey: string,
    private base: string = RA_BASE,
    private fetchFn: typeof fetch = fetch
  ) {}

  async getSummary(): Promise<RaSummary> {
    const url =
      `${this.base}/API/API_GetUserSummary.php` +
      `?u=${encodeURIComponent(this.username)}&y=${encodeURIComponent(this.apiKey)}&g=1&a=1`
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`RA API error: ${res.status}`)
    const raw = (await res.json()) as RawSummary
    const recent: RaGameProgress[] = (raw.RecentlyPlayed ?? []).map((g) => {
      const award = raw.Awarded?.[String(g.GameID)]
      const num = award?.NumAchieved ?? 0
      const possible = award?.NumPossibleAchievements ?? 0
      return {
        gameId: g.GameID,
        title: g.Title,
        console: g.ConsoleName,
        numAchieved: num,
        numPossible: possible,
        percent: possible > 0 ? Math.round((num / possible) * 100) : 0,
        iconUrl: g.ImageIcon ? `${this.base}${g.ImageIcon}` : null
      }
    })
    return {
      hardcorePoints: raw.TotalPoints ?? 0,
      softcorePoints: raw.TotalSoftcorePoints ?? 0,
      rank: raw.Rank ?? 0,
      totalRanked: raw.TotalRanked ?? 0,
      currentGame: recent[0] ?? null,
      recentGames: recent
    }
  }
}
