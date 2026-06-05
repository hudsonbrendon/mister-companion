import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { RaWebClient } from './raWeb'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('RaWebClient', () => {
  it('maps the RA user summary payload', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/API/API_GetUserSummary.php?u=hudson&y=key&g=1&a=1', body: {
        TotalPoints: 1234, TotalSoftcorePoints: 200, Rank: 42, TotalRanked: 100000,
        RecentlyPlayed: [{ GameID: 1, Title: 'Sonic', ConsoleName: 'Genesis', ImageIcon: '/i.png' }],
        Awarded: { '1': { NumAchieved: 5, NumPossibleAchievements: 50 } }
      } }
    ])
    close = mock.close
    const client = new RaWebClient('hudson', 'key', `http://127.0.0.1:${mock.port}`)
    const summary = await client.getSummary()
    expect(summary.hardcorePoints).toBe(1234)
    expect(summary.rank).toBe(42)
    expect(summary.recentGames[0].title).toBe('Sonic')
    expect(summary.recentGames[0].numPossible).toBe(50)
  })

  it('maps recent unlocks (array) with badge URLs', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/API/API_GetUserRecentAchievements.php?u=hudson&y=key&m=60', body: [
        { Title: 'First Blood', Description: 'Win a fight', Points: 10, GameID: 7, GameTitle: 'SF2', ConsoleName: 'Arcade', Date: '2026-06-05 12:00:00', BadgeName: '99887' }
      ] }
    ])
    close = mock.close
    const client = new RaWebClient('hudson', 'key', `http://127.0.0.1:${mock.port}`)
    const recent = await client.getRecent(60)
    expect(recent).toHaveLength(1)
    expect(recent[0].title).toBe('First Blood')
    expect(recent[0].gameTitle).toBe('SF2')
    expect(recent[0].points).toBe(10)
    expect(recent[0].badgeUrl).toBe('https://media.retroachievements.org/Badge/99887.png')
  })

  it('maps per-game progress (Achievements object) with earned flags, earned first', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/API/API_GetGameInfoAndUserProgress.php?u=hudson&y=key&g=7', body: {
        Title: 'Street Fighter II', ConsoleName: 'Arcade', ImageIcon: '/g.png',
        NumAchievements: 2, NumAwardedToUser: 1,
        Achievements: {
          '10': { ID: 10, Title: 'Locked One', Description: 'do x', Points: 5, BadgeName: '111' },
          '11': { ID: 11, Title: 'Earned One', Description: 'do y', Points: 25, BadgeName: '222', DateEarned: '2026-06-05 12:00:00' }
        }
      } }
    ])
    close = mock.close
    const client = new RaWebClient('hudson', 'key', `http://127.0.0.1:${mock.port}`)
    const detail = await client.getGameProgress(7)
    expect(detail.title).toBe('Street Fighter II')
    expect(detail.numAwarded).toBe(1)
    expect(detail.numAchievements).toBe(2)
    expect(detail.achievements).toHaveLength(2)
    // earned-first ordering
    expect(detail.achievements[0].title).toBe('Earned One')
    expect(detail.achievements[0].earned).toBe(true)
    expect(detail.achievements[1].earned).toBe(false)
    expect(detail.achievements[0].badgeUrl).toBe('https://media.retroachievements.org/Badge/222.png')
  })
})
