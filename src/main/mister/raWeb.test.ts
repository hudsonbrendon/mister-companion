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
})
