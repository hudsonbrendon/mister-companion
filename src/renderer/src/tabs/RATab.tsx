import { useState } from 'react'
import { api } from '../api'
import { RaSummary } from '@shared/types'

export function RATab(): JSX.Element {
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [summary, setSummary] = useState<RaSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    api.raSummary(username, apiKey)
      .then((s) => { setSummary(s); setError(null) })
      .catch((e) => setError(String(e)))
  }

  return (
    <div className="ra">
      <div className="ra-creds">
        <input placeholder="RA Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <button onClick={load} disabled={!username || !apiKey}>Load</button>
      </div>
      {error && <div className="error">{error}</div>}
      {summary && (
        <div className="ra-summary">
          <div className="ra-points">{summary.hardcorePoints} pts · Rank #{summary.rank}</div>
          <ul className="ra-games">
            {summary.recentGames.map((g) => (
              <li key={g.gameId}>
                {g.iconUrl && <img src={g.iconUrl} alt="" width={24} height={24} />}
                <span>{g.title}</span>
                <span className="progress">{g.numAchieved}/{g.numPossible} ({g.percent}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
