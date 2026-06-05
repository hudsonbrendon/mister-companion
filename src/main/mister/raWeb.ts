import { RaSummary, RaGameProgress, RaRecentUnlock, RaGameDetail, RaAchievementDetail } from '@shared/types'

const BADGE_BASE = 'https://media.retroachievements.org/Badge'
const badge = (name?: string): string | null => (name ? `${BADGE_BASE}/${name}.png` : null)

interface RawRecentAch {
  Title?: string; Description?: string; Points?: number
  GameID?: number; GameTitle?: string; ConsoleName?: string
  Date?: string; BadgeName?: string
}
interface RawGameAch {
  ID?: number; Title?: string; Description?: string; Points?: number
  BadgeName?: string; DateEarned?: string
}
interface RawGameProgress {
  Title?: string; ConsoleName?: string; ImageIcon?: string
  NumAchievements?: number; NumAwardedToUser?: number
  Achievements?: Record<string, RawGameAch>
}

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

  private auth(): string {
    return `u=${encodeURIComponent(this.username)}&y=${encodeURIComponent(this.apiKey)}`
  }

  async getRecent(minutes = 60): Promise<RaRecentUnlock[]> {
    const url = `${this.base}/API/API_GetUserRecentAchievements.php?${this.auth()}&m=${minutes}`
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`RA API error: ${res.status}`)
    const raw = (await res.json()) as unknown
    if (!Array.isArray(raw)) return []
    return (raw as RawRecentAch[]).map((a) => ({
      title: a.Title ?? '',
      description: a.Description ?? '',
      points: a.Points ?? 0,
      gameId: a.GameID ?? 0,
      gameTitle: a.GameTitle ?? '',
      console: a.ConsoleName ?? '',
      date: a.Date ?? '',
      badgeUrl: badge(a.BadgeName)
    }))
  }

  async getGameProgress(gameId: number): Promise<RaGameDetail> {
    const url = `${this.base}/API/API_GetGameInfoAndUserProgress.php?${this.auth()}&g=${gameId}`
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`RA API error: ${res.status}`)
    const raw = (await res.json()) as RawGameProgress
    const achievements: RaAchievementDetail[] = Object.values(raw.Achievements ?? {}).map((a) => ({
      id: a.ID ?? 0,
      title: a.Title ?? '',
      description: a.Description ?? '',
      points: a.Points ?? 0,
      badgeUrl: badge(a.BadgeName),
      earned: !!a.DateEarned,
      dateEarned: a.DateEarned ?? null
    }))
    // Earned first, then by points.
    achievements.sort((x, y) =>
      x.earned === y.earned ? y.points - x.points : x.earned ? -1 : 1
    )
    return {
      title: raw.Title ?? '',
      console: raw.ConsoleName ?? '',
      iconUrl: raw.ImageIcon ? `${this.base}${raw.ImageIcon}` : null,
      numAwarded: raw.NumAwardedToUser ?? 0,
      numAchievements: raw.NumAchievements ?? 0,
      achievements
    }
  }
}
