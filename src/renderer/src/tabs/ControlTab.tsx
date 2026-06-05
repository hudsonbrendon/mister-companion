import { useState } from 'react'
import { api } from '../api'

export function ControlTab(): JSX.Element {
  const [path, setPath] = useState('')
  return (
    <div className="control">
      <div className="launch-row">
        <input
          placeholder="Path to game (e.g. /media/fat/games/SNES/Zelda.sfc)"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button onClick={() => api.launchGame(path)} disabled={!path}>Launch</button>
      </div>
      <button className="danger" onClick={() => api.reboot()}>Reboot MiSTer</button>
    </div>
  )
}
